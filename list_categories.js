import mongoose from 'mongoose';
import config from './config/config.js';

async function listCategories() {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);
    
    const categories = await collection.distinct('category');
    const counts = {};
    
    for (const cat of categories) {
        counts[cat || 'uncategorized'] = await collection.countDocuments({ category: cat });
    }
    
    console.log("Database Sections (Categories):");
    console.log(JSON.stringify(counts, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listCategories();
