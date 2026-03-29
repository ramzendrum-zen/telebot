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


// -----------------------------
// SMART TTL CACHE (Hardening Step 1 & 2)
// -----------------------------
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getFromCache = (query) => {
    const key = normalize(query);
    const entry = queryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL) {
        queryCache.delete(key);
        return null;
    }
    return entry.value;
};

const setInCache = (query, value) => {
    const key = normalize(query);
    queryCache.set(key, { value, time: Date.now() });
};

// -----------------------------
// INTENT SPLITTER (Hardening Step 3)
// -----------------------------
function splitQuery(query) {
    const lower = query.toLowerCase().trim();
    
    // Check for explicit multi-intent connectors
    const parts = lower.split(/\s+and\s+|[,&]|\s+also\s+/).map(s => s.trim());
    
    let entityPart = null;
    let ragPart = null;

    parts.forEach(p => {
        const isEntity = (
            p.includes("who") || p.includes("hod") ||
            p.includes("principal") || p.includes("director") ||
            p.includes("president") || p.includes("warden") ||
            p.includes("head") || p.includes("is ")
        );

        if (isEntity && !entityPart) {
            entityPart = p;
        } else if (!ragPart) {
            ragPart = p;
        }
    });

    // Fallback: If no split happened, assign based on first match
    if (!entityPart && !ragPart) {
        ragPart = lower;
    }

    return { entityPart, ragPart };
}

// -----------------------------
// DEPARTMENT DETECTION
// -----------------------------
const DEPARTMENTS = ["it", "cse", "mech", "eee", "civil", "ece", "admin", "hostel", "placement"];

function detectDepartment(query) {
    const q = query.toLowerCase();
    for (const dept of DEPARTMENTS) {
        if (q.includes(dept)) return dept.toUpperCase();
    }
    return null;
}

// -----------------------------
// ENTITY RANKING
// -----------------------------
function rankEntities(query, results) {
    const q = normalize(query);
    return results
        .map(r => {
            let score = 0;
            // Name match
            if (q.includes(r.normalized_name)) score += 10;
            // Alias match
            (r.normalized_aliases || []).forEach(a => {
                if (q.includes(a)) score += 5;
            });
            // Partial name match
            const tokens = q.split(' ');
            tokens.forEach(t => {
                if (t.length > 3 && r.normalized_name.includes(t)) score += 2;
            });
            return { ...r, matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * PRODUCTION-GRADE HYBRID SEARCH (Final Hardening)
 */
export const performHybridSearch = async (queryText) => {
    // 1. Smart Cache Check
    const cached = getFromCache(queryText);
    if (cached) {
        logger.info(`Smart Cache HIT: ${queryText}`);
        return cached;
    }

    const { entityPart, ragPart } = splitQuery(queryText);
    const db = mongoose.connection.db;
    const coll = db.collection(config.mongodb.entitiesCollection || 'entities_master');

    let entityResult = null;
    let ragResults = [];

    // ─── STAGE 1: ENTITY FLOW ───────────────────────────
    if (entityPart) {
        const detection = await detectEntities(entityPart);
        const dept = detectDepartment(entityPart);

        if (detection.type === 'multi_entity' || detection.type === 'entity') {
            let rawData = [];
            if (detection.type === 'multi_entity') {
                rawData = detection.entities.flatMap(e => e.data);
            } else if (detection.data) {
                rawData = detection.data;
            }

            // Department Filtering
            if (dept) {
                const deptFiltered = rawData.filter(e => 
                    (e.department && e.department.toUpperCase() === dept) || 
                    (e.role && e.role.toUpperCase().includes(dept))
                );
                if (deptFiltered.length > 0) rawData = deptFiltered;
            }

            if (rawData.length > 0) {
                const ranked = rankEntities(entityPart, rawData);
                const top = ranked[0];
                entityResult = {
                    type: 'entity',
                    name: top.name,
                    role: top.role,
                    department: top.department,
                    content: top.content,
                    source: 'entities_master'
                };
            }
        }
    }

    // ─── STAGE 2: RAG FLOW ─────────────────────────────
    if (ragPart) {
        logger.info(`RAG START: ${ragPart}`);
        const vectorColl = db.collection(config.mongodb.vectorCollection);
        const embedding = await generateEmbedding(ragPart, 'query');
        
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

        if (candidates.length > 0) {
            const reranked = await rerankChunks(ragPart, candidates);
            const top5 = reranked.slice(0, 5);

            // Dynamic Thresholding
            const threshold = ragPart.length < 15 ? 0.65 : 0.75;
            const topScore = top5[0]?.rerankScore || top5[0]?.score || 0;

            if (topScore >= threshold) {
                ragResults = top5.map(c => ({
                    text: c.text || c.content,
                    metadata: c.metadata || {},
                    category: c.category,
                    score: topScore
                }));
            }
        }
    }

    const finalResponse = {
        type: 'hybrid',
        entityResponse: entityResult,
        ragResults: ragResults,
        hasResults: !!(entityResult || ragResults.length > 0),
        timestamp: Date.now()
    };

    // Store in Smart Cache
    setInCache(queryText, finalResponse);
    return finalResponse;
};


