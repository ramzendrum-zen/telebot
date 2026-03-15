const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME
    });
    const db = mongoose.connection.db;
    const collection = db.collection(process.env.VECTOR_COLLECTION);
    const doc = await collection.findOne();
    console.log('--- DOCUMENT SAMPLE ---');
    console.log(JSON.stringify(doc, null, 2));
    console.log('--- END SAMPLE ---');
    
    // Also count docs
    const count = await collection.countDocuments();
    console.log('Total documents in collection:', count);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
