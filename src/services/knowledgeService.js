const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Searches the vector_store collection for relevant text.
 * Note: This uses standard text search. If you have Atlas Vector Search indices, 
 * this can be upgraded to true vector search.
 */
const getContextFromDB = async (query) => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(process.env.VECTOR_COLLECTION || 'vector_store');
    
    // Clean and tokenize the query
    const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with']);
    const keywords = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    if (keywords.length === 0) return "";

    // Create a regex that matches any of the keywords
    const regexQuery = keywords.join('|');
    logger.info(`Searching DB for keywords: ${keywords.join(', ')}`);

    const results = await collection.find({
      $or: [
        { text: { $regex: regexQuery, $options: 'i' } },
        { content: { $regex: regexQuery, $options: 'i' } },
        { metadata: { $regex: regexQuery, $options: 'i' } }
      ]
    }).limit(5).toArray();

    if (results.length === 0) {
      logger.info("No matching documents found in DB.");
      return "";
    }

    logger.info(`Found ${results.length} relevant documents.`);
    return results.map(doc => doc.text || doc.content || JSON.stringify(doc)).join("\n---\n");
  } catch (error) {
    logger.error("Database Search Error: ", error);
    return "";
  }
};

module.exports = { getContextFromDB };
