const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });
    const db = mongoose.connection.db;
    const collection = db.collection(process.env.VECTOR_COLLECTION);
    
    const query = "placement";
    const results = await collection.find({
      $or: [
        { text: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { metadata: { $regex: query, $options: 'i' } }
      ]
    }).limit(5).toArray();

    console.log(`--- SEARCH RESULTS FOR "${query}" ---`);
    results.forEach((doc, i) => {
      console.log(`Result ${i+1}:`, doc.text || doc.content || "NO TEXT FIELD");
    });
    console.log('--- END RESULTS ---');
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
