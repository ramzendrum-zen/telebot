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
    
    // Simple regex search as a fallback if vector search isn't indexed yet
    // This looks for matching keywords in the data
    const results = await collection.find({
      $or: [
        { text: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { metadata: { $regex: query, $options: 'i' } }
      ]
    }).limit(3).toArray();

    if (results.length === 0) return "";

    return results.map(doc => doc.text || doc.content || JSON.stringify(doc)).join("\n---\n");
  } catch (error) {
    logger.error("Database Search Error: ", error);
    return "";
  }
};

module.exports = { getContextFromDB };
