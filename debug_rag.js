const mongoose = require('mongoose');
const config = require('./config/config');
require('dotenv').config();

async function debugSearch() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    const db = mongoose.connection.db;
    const collection = db.collection(process.env.VECTOR_COLLECTION || 'vector_store');
    
    const queryText = "who is the principal";
    const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with']);
    const keywords = queryText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    console.log("KEYWORDS:", keywords);
    const regexQuery = keywords.join('|');
    
    const results = await collection.find({
      $or: [
        { text: { $regex: regexQuery, $options: 'i' } },
        { content: { $regex: regexQuery, $options: 'i' } },
        { metadata: { $regex: regexQuery, $options: 'i' } }
      ]
    }).limit(5).toArray();

    console.log("RESULTS_COUNT:", results.length);
    results.forEach((r, i) => {
      console.log(`\nRESULT ${i+1}:`);
      console.log(r.text || r.content || JSON.stringify(r).substring(0, 200));
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

debugSearch();
