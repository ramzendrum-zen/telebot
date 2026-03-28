import mongoose from 'mongoose';
import config from './config/config.js';
import fs from 'fs';

async function analyzeGeneral() {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);
    
    // Process all general docs
    const docs = await collection.find({ category: 'general' }).toArray();
    
    const analysis = docs.map(d => ({
        id: d._id,
        title: d.title || 'Untitled',
        text: (d.text || '').slice(0, 100),
        source: d.source || 'unknown'
    }));
    
    fs.writeFileSync('general_analysis.json', JSON.stringify(analysis, null, 2));
    console.log(`Analyzed ${docs.length} general docs.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

analyzeGeneral();
