import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';

/**
 * Performs hybrid search (Vector + Keyword) on MongoDB.
 */
export const performHybridSearch = async (queryText) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);

    // 1. Generate Query Embedding with timeout handling
    let queryEmbedding = null;
    try {
      queryEmbedding = await generateEmbedding(queryText);
    } catch (e) {
      logger.warn(`Vector Search Bypass: Embedding failed, falling back to keywords only. (${e.message})`);
    }

    // 2. Perform Vector Search (only if embedding succeeded)
    let vectorResults = [];
    if (queryEmbedding) {
      vectorResults = await collection.aggregate([
        {
          "$vectorSearch": {
            "index": config.mongodb.vectorIndex,
            "path": "embedding",
            "queryVector": queryEmbedding,
            "numCandidates": 200, // Increased for better accuracy
            "limit": 10 // Get more candidates to ensure we find the right one
          }
        },
        {
          "$project": {
            "text": 1,
            "score": { "$meta": "vectorSearchScore" }
          }
        }
      ]).toArray();
    }

    // 3. Perform Keyword Matching (Fallback/Boost)
    // We clean the query for common MSAJCE terms to ensure hits
    const rawKeywords = queryText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const stopWords = new Set(['who', 'is', 'the', 'what', 'where', 'tell', 'me', 'about']);
    const keywords = rawKeywords.filter(w => w.length > 2 && !stopWords.has(w));
    
    let keywordResults = [];
    if (keywords.length > 0) {
      const regexQuery = keywords.join('|');
      keywordResults = await collection.find({
        $or: [
          { text: { "$regex": regexQuery, "$options": "i" } },
          { content: { "$regex": regexQuery, "$options": "i" } }
        ]
      }).limit(5).toArray();
    }

    // 4. Merge and Re-rank
    const mergedResults = [...vectorResults];
    
    // Add keyword results with a boost if they aren't already in vector results
    keywordResults.forEach(kr => {
      const snippet = kr.text || kr.content || "";
      if (!mergedResults.find(vr => (vr.text || "").substring(0, 30) === snippet.substring(0, 30))) {
        mergedResults.push({ text: snippet, score: 0.8 }); // Boosted score for exact keyword matches
      }
    });

    // Sort by score and limit to top K
    const finalResults = mergedResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, config.rag.topK);

    logger.info(`Hybrid Search found ${finalResults.length} chunks for: ${queryText}`);
    return finalResults;
  } catch (error) {
    logger.error(`Retrieval Service Error: ${error.message}`);
    return [];
  }
};
