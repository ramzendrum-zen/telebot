import mongoose from 'mongoose';
import config from './config/config.js';

async function analyzeGeneral() {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);
    
    // Sample 50 docs from 'general' category
    const docs = await collection.find({ category: 'general' }).limit(50).toArray();
    
    console.log("Sample documents from 'general' category:");
    docs.forEach(d => {
        console.log(`- [${d._id}] ${d.title || 'Untitled'} | Text: ${(d.text || '').slice(0, 50)}...`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

analyzeGeneral();
