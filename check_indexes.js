const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });
    const db = mongoose.connection.db;
    const collection = db.collection(process.env.VECTOR_COLLECTION);
    
    console.log('--- SEARCH INDEXES ---');
    const indexes = await collection.listSearchIndexes().toArray();
    console.log(JSON.stringify(indexes, null, 2));
    console.log('--- END INDEXES ---');
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
