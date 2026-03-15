const mongoose = require('mongoose');
const config = require('../config/config');
const { generateEmbedding } = require('./embeddingService');
const logger = require('../utils/logger');

/**
 * Performs hybrid search (Vector + Keyword) on MongoDB.
 */
const performHybridSearch = async (queryText) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);

    // 1. Generate Query Embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // 2. Perform Vector Search
    const vectorResults = await collection.aggregate([
      {
        "$vectorSearch": {
          "index": config.mongodb.vectorIndex,
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 100,
          "limit": 5
        }
      },
      {
        "$project": {
          "text": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ]).toArray();

    // 3. Perform Keyword Matching (Fallback/Boost)
    const keywords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const regexQuery = keywords.length > 0 ? keywords.join('|') : null;
    
    let keywordResults = [];
    if (regexQuery) {
      keywordResults = await collection.find({
        "text": { "$regex": regexQuery, "$options": "i" }
      }).limit(3).toArray();
    }

    // 4. Merge and Re-rank
    const mergedResults = [...vectorResults];
    
    // Add keyword results if they aren't already in vector results (by simple string prefix check or deduplication)
    keywordResults.forEach(kr => {
      if (!mergedResults.find(vr => vr.text && vr.text.substring(0, 50) === kr.text.substring(0, 50))) {
        mergedResults.push({ ...kr, score: 0.5 }); // Static boost score
      }
    });

    // Sort by score
    return mergedResults.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (error) {
    logger.error(`Retrieval Error: ${error.message}`);
    return [];
  }
};

module.exports = { performHybridSearch };
