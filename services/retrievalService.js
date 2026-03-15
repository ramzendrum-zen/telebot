import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';

/**
 * PRODUCTION-GRADE HYBRID SEARCH
 * Combines Vector Search, Exact Keyword matching, and Metadata stop searches.
 */
export const performHybridSearch = async (queryText, intent = 'general') => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);

    // Normalize for search
    const q = queryText.toLowerCase();
    const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with', 'abt', 'which', 'will', 'go', 'can', 'provide', 'give', 'detail', 'details', 'information', 'info', 'please', 'any', 'to', 'how']);
    
    const words = q.split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));

    // 1. Metadata / Exact Keyword Match (Highest Priority)
    let keywordResults = [];
    if (words.length > 0) {
      // Build a flexible regex for route numbers like AR8
      const regexPatterns = words.map(w => {
        // Use word boundaries for very short keywords like 'bus' or 'ram'
        if (w.length <= 3) return `\\b${w.split('').join('[\\W_]?')}\\b`;
        return w.split('').join('[\\W_]?');
      }).join('|');
      
      const searchFilter = {
        $or: [
          ...words.map(w => ({ "metadata.keywords": { $regex: w.replace('-', '[\\W_]?'), $options: 'i' } })),
          ...words.map(w => ({ "metadata.route": { $regex: w.replace('-', '[\\W_]?'), $options: 'i' } })),
          ...words.map(w => ({ "metadata.name": { $regex: w.replace('-', '[\\W_]?'), $options: 'i' } })),
          ...words.map(w => ({ "metadata.nickname": { $regex: w.replace('-', '[\\W_]?'), $options: 'i' } })),
          ...words.map(w => ({ "metadata.url": { $regex: w, $options: 'i' } })),
          { text: { $regex: regexPatterns, $options: 'i' } }
        ]
      };

      keywordResults = await collection.find(searchFilter).limit(50).toArray();
      
      // Initial Score for Keyword Matches
      keywordResults = keywordResults.map(kr => {
        let score = 1.0; // Base score for any keyword match
        const txt = kr.text.toLowerCase();
        
        words.forEach(w => {
          // Absolute priority for name match
          if (kr.metadata?.name && kr.metadata.name.toLowerCase().includes(w)) score += 5.0;
          if (kr.metadata?.nickname && kr.metadata.nickname.toLowerCase() === w) score += 5.0;
          
          // Absolute priority for route match
          if (kr.metadata?.route && kr.metadata.route.toLowerCase().includes(w)) score += 5.0;
          
          // Boost for URL match (Very relevant for "Principal" page)
          if (kr.metadata?.url && kr.metadata.url.toLowerCase().includes(w)) score += 4.0;
          
          if (txt.includes(w)) score += 1.0;
        });

        return { ...kr, score };
      });
    }

    // 2. Vector Search (Semantic)
    let vectorResults = [];
    try {
      const queryEmbedding = await generateEmbedding(queryText);
      vectorResults = await collection.aggregate([
        {
          "$vectorSearch": {
            "index": config.mongodb.vectorIndex,
            "path": "embedding",
            "queryVector": queryEmbedding,
            "numCandidates": 50,
            "limit": 10
          }
        },
        {
          "$project": {
            "text": 1,
            "metadata": 1,
            "score": { "$meta": "vectorSearchScore" }
          }
        }
      ]).toArray();
    } catch (e) {
      logger.warn(`Vector Search Error: ${e.message}`);
    }

    // 3. Merge & Ranking
    const mergedMap = new Map();
    
    // Sort keyword results by their specific score first
    keywordResults.sort((a, b) => b.score - a.score);
    const topKeywordScore = keywordResults.length > 0 ? keywordResults[0].score : 0;

    // Process keyword results
    keywordResults.forEach(r => mergedMap.set(r._id.toString(), r));

    // Process vector results
    vectorResults.forEach(vr => {
      const id = vr._id.toString();
      if (!mergedMap.has(id)) {
        // Only add vector results if they are relevant and we don't have overwhelming keyword matches
        if (topKeywordScore < 5.0) {
          mergedMap.set(id, vr);
        }
      } else {
        const existing = mergedMap.get(id);
        existing.score = (existing.score || 0) + (vr.score * 2); 
      }
    });

    let finalResults = Array.from(mergedMap.values());
    
    // Log chunk names for dashboard visibility
    const chunkNames = finalResults.map(r => r.metadata?.route || r.metadata?.name || 'General Info').slice(0, 5).join(', ');
    pushLog('rag_step', `Found Chunks: [${chunkNames}]`).catch(() => {});

    if (topKeywordScore > 5.0) {
      finalResults = finalResults.filter(r => r.score > 2.0);
    }

    finalResults = finalResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5); // Keep context tight

    logger.info(`Hybrid Search [${intent}]: Final ${finalResults.length} chunks. Top score: ${finalResults[0]?.score || 0}`);
    return finalResults;
  } catch (error) {
    logger.error(`Retrieval Service Error: ${error.message}`);
    return [];
  }
};
