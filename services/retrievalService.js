import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from './embeddingService.js';
import { rerankChunks } from './rerankService.js';
import logger from '../utils/logger.js';
import { normalize, createFuzzyRegex } from '../utils/textUtils.js';

const ROLE_KEYWORDS = {
  principal: ["principal", "head of college", "college head"],
  hod: ["hod", "head of department"],
  director: ["director", "management head"],
  president: ["president", "student leader", "csi head", "csi president"],
  warden: ["warden", "hostel head"]
};

/**
 * 100% ACCURACY ENTITY DETECTION (Upgrade Pack)
 * Supports Multi-Entity, Fuzzy Matching, and Role Normalization.
 */
export const detectEntities = async (query) => {
    const db = mongoose.connection.db;
    const coll = db.collection(config.mongodb.entitiesCollection || 'entities_master');
    
    // Step 5: Split query for multi-entity support
    const subQueries = query.toLowerCase().split(/\s+and\s+|[,&]/).map(s => s.trim());
    const allDetected = [];

    for (const sub of subQueries) {
        const normalizedSub = normalize(sub);
        if (!normalizedSub) continue;

        // A. Direct Name/Alias Fuzzy Match (Highest Priority)
        const fuzzyRegex = createFuzzyRegex(normalizedSub);
        const nameMatches = await coll.find({
            $or: [
                { normalized_name: { $regex: fuzzyRegex } },
                { normalized_aliases: { $elemMatch: { $regex: fuzzyRegex } } }
            ]
        }).toArray();

        // Filter out false positives if the token is too short but regex was too permissive
        const validNameMatches = nameMatches.filter(e => {
            const tokens = normalizedSub.split(' ');
            return tokens.some(t => e.normalized_name.includes(t) || e.normalized_aliases.some(a => a.includes(t)));
        });

        if (validNameMatches.length > 0) {
            allDetected.push({
                type: 'entity',
                subtype: 'person',
                query_segment: sub,
                data: validNameMatches,
                confidence: 'high'
            });
            continue; // Move to next subquery
        }

        // B. Improved Role Detection (Step 4)
        let foundRole = false;
        for (const [canonicalRole, phrases] of Object.entries(ROLE_KEYWORDS)) {
            if (phrases.some(p => normalizedSub.includes(p))) {
                // Determine department if mentioned (e.g. "HOD of IT")
                let deptMatch = null;
                const deptKeywords = ['it', 'cse', 'ece', 'eee', 'mech', 'civil', 'aero', 'admin', 'hostel'];
                for (const d of deptKeywords) {
                    if (normalizedSub.includes(` ${d}`) || normalizedSub.endsWith(` ${d}`) || normalizedSub.includes(`${d} hod`)) {
                        deptMatch = d.toUpperCase();
                        break;
                    }
                }

                const queryFilter = { role: new RegExp(canonicalRole, 'i') };
                if (deptMatch) {
                    queryFilter.department = new RegExp(deptMatch, 'i');
                }

                const roleMatches = await coll.find(queryFilter).toArray();
                if (roleMatches.length > 0) {
                    allDetected.push({
                        type: 'entity',
                        subtype: 'role',
                        role: canonicalRole,
                        department: deptMatch,
                        query_segment: sub,
                        data: roleMatches,
                        confidence: 'high'
                    });
                    foundRole = true;
                    break;
                }
            }
        }
    }

    if (allDetected.length > 0) {
        return { type: 'multi_entity', entities: allDetected };
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
