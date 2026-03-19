import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';
import { pushLog } from './monitorService.js';

/**
 * PRODUCTION-GRADE HYBRID SEARCH
 * Combines Vector Search (semantic) + Keyword Matching with robust scoring.
 */
export const performHybridSearch = async (queryText, category = 'general', filters = {}) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);

    // Normalize query
    const q = queryText.toLowerCase().trim();
    const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with', 'abt', 'which', 'will', 'go', 'can', 'give', 'please', 'any', 'to', 'how']);

    const words = q.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));

    // 1. KEYWORD SEARCH with METADATA FILTERS (Self-Querying Optimization)
    let keywordResults = [];
    if (words.length > 0) {
      const simplePatterns = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); 

      const baseOr = [
          { text: { $regex: simplePatterns.join('|'), $options: 'i' } },
          { content: { $regex: simplePatterns.join('|'), $options: 'i' } },
          { title: { $regex: simplePatterns.join('|'), $options: 'i' } },
          { summary: { $regex: simplePatterns.join('|'), $options: 'i' } },
          { query_variations: { $elemMatch: { $regex: simplePatterns.join('|'), $options: 'i' } } },
          { keywords: { $elemMatch: { $regex: simplePatterns.join('|'), $options: 'i' } } },
          { entities: { $elemMatch: { $regex: simplePatterns.join('|'), $options: 'i' } } }
      ];

      // Add category constraint if specific
      const searchFilter = { $or: baseOr };
      if (category && category !== 'general') {
          searchFilter.category = category;
      }

      // Apply metadata filters (e.g. metadata.route: "AR-8")
      if (filters && Object.keys(filters).length > 0) {
          for (const [key, val] of Object.entries(filters)) {
              searchFilter[`metadata.${key}`] = { $regex: val, $options: 'i' };
          }
      }

      keywordResults = await collection.find(searchFilter).limit(100).toArray();

      // Score keyword results
      keywordResults = keywordResults.map(doc => {
        let score = 1.0;
        const txt = (doc.text || doc.content || '').toLowerCase();
        const titleLower = (doc.title || '').toLowerCase();
        const summaryLower = (doc.summary || '').toLowerCase();
        const queryVars = (doc.query_variations || []).map(q => q.toLowerCase());
        const docEntities = (doc.entities || []).map(e => e.toLowerCase());
        const docKeywords = (doc.keywords || []).map(k => k.toLowerCase());

        words.forEach(w => {
          // Exact route match = highest priority for transport
          if (doc.metadata?.route && doc.metadata.route.toLowerCase() === w) score += 8.0;

          // Name match for faculty
          if (doc.metadata?.name && doc.metadata.name.toLowerCase().includes(w)) score += 7.0;

          // Query variation match — strongest signal for vague queries (e.g. "principal" matches "who is the principal")
          if (queryVars.some(qv => qv.includes(w))) score += 6.0;

          // Entity match (e.g. "Principal" in entities list)
          if (docEntities.some(e => e.includes(w))) score += 5.0;

          // Keyword array match
          if (docKeywords.some(k => k.includes(w))) score += 4.0;

          // Title match
          if (titleLower.includes(w)) score += 4.0;

          // Summary match
          if (summaryLower.includes(w)) score += 2.0;

          // Full word in text
          const wordRegex = new RegExp(`\\b${w}\\b`, 'i');
          if (wordRegex.test(txt)) score += 3.0;
          else if (txt.includes(w)) score += 1.0;
        });

        // Boost curated sources
        if (doc.source === 'verified_transport') score += 5.0;
        if (doc.source === 'verified_faculty')   score += 5.0;
        if (doc.source === 'verified_data')       score += 5.0; // covers verified_admin + transport
        if (doc.source === 'verified_trust')      score += 3.0;

        return { ...doc, score };
      });
    }

    // 2. VECTOR SEARCH — semantic similarity
    let vectorResults = [];
    try {
      const queryEmbedding = await generateEmbedding(queryText, 'query');
      const vectorPipeline = [
        {
          "$vectorSearch": {
            "index": config.mongodb.vectorIndex,
            "path": "embedding",
            "queryVector": queryEmbedding,
            "numCandidates": 100,
            "limit": 15
          }
        }
      ];

      // Filter by category within vector search if not general
      if (category && category !== 'general') {
          vectorPipeline.push({ $match: { category: category } });
      }

      vectorPipeline.push({
        "$project": {
          "text": 1, "content": 1, "title": 1,
          "metadata": 1, "source": 1, "category": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      });

      vectorResults = await collection.aggregate(vectorPipeline).toArray();
    } catch (e) {
      logger.warn(`Vector Search Error: ${e.message}`);
    }

    // 3. MERGE & RANK — hybrid scoring
    const mergedMap = new Map();

    // Add keyword results first
    keywordResults.forEach(r => {
      mergedMap.set(r._id.toString(), { ...r, finalScore: r.score, matchType: 'keyword' });
    });

    // Merge vector results with strong semantic boost
    vectorResults.forEach(vr => {
      const id = vr._id.toString();
      const semanticBoost = vr.score * 10; // Scale 0-1 vector score up

      if (mergedMap.has(id)) {
        // Hybrid: appeared in both — give big boost
        const existing = mergedMap.get(id);
        existing.finalScore = (existing.finalScore || 0) + semanticBoost + 5; // +5 hybrid bonus
        existing.matchType = 'hybrid';
      } else {
        mergedMap.set(id, { ...vr, finalScore: semanticBoost, matchType: 'vector' });
      }
    });

    let finalResults = Array.from(mergedMap.values())
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
      .slice(0, 20); // Top 20 for Reranker

    const chunkNames = finalResults.map(r =>
      r.metadata?.route || r.metadata?.name || r.title || 'General Info'
    ).join(', ');

    pushLog('rag_step', `Found Chunks: [${chunkNames}]`).catch(() => {});
    logger.info(`Hybrid Search: Final ${finalResults.length} chunks. Top score: ${finalResults[0]?.finalScore || 0}`);

    // Return in the shape the rest of the app expects
    return finalResults.map(r => ({ ...r, score: r.finalScore }));
  } catch (error) {
    logger.error(`Retrieval Service Error: ${error.message}`);
    return [];
  }
};
