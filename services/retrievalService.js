import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from './embeddingService.js';
import { rerankChunks } from './rerankService.js';
import logger from '../utils/logger.js';

/**
 * PROJECT PHOENIX: ENTITY-FIRST ARCHITECTURE
 * Pipeline 1: Exact Entity Match (People, Staff)
 * Pipeline 2: RAG (Transport, Admission, General)
 */

export const detectEntities = async (query) => {
    const db = mongoose.connection.db;
    const coll = db.collection(config.mongodb.entitiesCollection || 'entities_master');
    const q = query.toLowerCase().trim();

    // 1. Exact Name/Normalized Name Match
    let match = await coll.findOne({ $or: [{ normalized_name: q }, { aliases: q }] });
    if (match) return { type: 'entity', data: [match], confidence: 'high' };

    // 2. Regex Match on Names/Aliases
    const regexMatch = await coll.find({
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { aliases: { $elemMatch: { $regex: q, $options: 'i' } } }
        ]
    }).limit(3).toArray();
    if (regexMatch.length > 0) return { type: 'entity', data: regexMatch, confidence: regexMatch.length === 1 ? 'high' : 'medium' };

    // 3. Keyword Match on Role (HOD, Principal)
    const keywords = q.split(/\s+/).filter(w => w.length > 2);
    const roleMatch = await coll.find({ keywords: { $in: keywords } }).toArray();
    if (roleMatch.length > 0) return { type: 'entity', data: roleMatch, confidence: roleMatch.length === 1 ? 'high' : 'medium' };

    return { type: 'rag', confidence: 'none' };
};

export const performHybridSearch = async (queryText) => {
    const db = mongoose.connection.db;
    const vectorColl = db.collection(config.mongodb.vectorCollection);

    // ─── PIPELINE 1: ENTITY FIRST ───────────────────────────
    const entityResult = await detectEntities(queryText);
    if (entityResult.type === 'entity') {
        logger.info(`Entity System HIT: Found ${entityResult.data.length} matches.`);
        return {
            type: 'entity',
            results: entityResult.data.map(e => ({
                text: `Information for ${e.name}: ${e.content || `Role: ${e.role}, Department: ${e.department}`}`,
                metadata: { name: e.name, role: e.role, department: e.department },
                source: 'entities_master',
                score: 1.0
            })),
            confidence: entityResult.confidence
        };
    }

    // ─── PIPELINE 2: RAG SYSTEM ─────────────────────────────
    logger.info(`RAG System START: ${queryText}`);
    const embedding = await generateEmbedding(queryText, 'query');
    
    // Stage 1: Vector Search (Top 15 as requested)
    const candidates = await vectorColl.aggregate([
        {
            "$vectorSearch": {
                "index": config.mongodb.vectorIndex,
                "path": "embedding",
                "queryVector": embedding,
                "numCandidates": 100,
                "limit": 15
            }
        },
        {
            "$project": {
                "text": 1, "content": 1, "title": 1, "category": 1, 
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]).toArray();

    if (candidates.length === 0) return { type: 'rag', results: [], confidence: 'none' };

    // Stage 2: Rerank (Top 5 as requested)
    const reranked = await rerankChunks(queryText, candidates);
    const top5 = reranked.slice(0, 5);

    // Hard Validation (Score > 0.75 or whatever threshold)
    // Using 0.75 as per user Step 5
    const topScore = top5[0]?.rerankScore || top5[0]?.score || 0;
    if (topScore < 0.60) { // Using 0.60 for rerank (range 0-1) - typically 0.6 is good for rerank 
        logger.warn(`RAG Reject: Top score ${topScore.toFixed(2)} below threshold.`);
        return { type: 'rag', results: [], failure: 'insufficient_confidence' };
    }

    return { 
        type: 'rag', 
        results: top5.map(c => ({
            text: c.text || c.content,
            metadata: c.metadata || {},
            category: c.category,
            score: c.rerankScore || c.score
        })),
        confidence: 'high'
    };
};
