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

const ROLE_KEYWORDS = {
  principal: "Principal",
  hod: "HOD",
  director: "Director",
  president: "Student President",
  warden: "Warden"
};

export const detectEntities = async (query) => {
    const db = mongoose.connection.db;
    const coll = db.collection(config.mongodb.entitiesCollection || 'entities_master');
    const q = query.toLowerCase().trim();

    // 1. Direct Name/Alias Regex Match (Highest Priority)
    const allEntities = await coll.find({}).toArray();
    const nameMatches = allEntities.filter(e => {
        const name = e.name.toLowerCase();
        const aliases = (e.aliases || []).map(a => a.toLowerCase());
        return q.includes(name) || aliases.some(a => q.includes(a));
    });

    if (nameMatches.length > 0) {
        return { type: 'entity', subtype: 'person', data: nameMatches, confidence: 'high' };
    }

    // 2. Strict Role Match
    for (const [key, roleValue] of Object.entries(ROLE_KEYWORDS)) {
        if (q.includes(key)) {
            const roleMatches = await coll.find({ role: roleValue }).toArray();
            if (roleMatches.length > 0) {
                return { type: 'entity', subtype: 'role', value: roleValue, data: roleMatches, confidence: 'high' };
            }
        }
    }

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
            subtype: entityResult.subtype,
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

    // Hard Validation (Increased to 0.75 for strict accuracy as requested)
    const topScore = top5[0]?.rerankScore || top5[0]?.score || 0;
    if (topScore < 0.75) { 
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
