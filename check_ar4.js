import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config/config.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("--- Searching for AR-4 or AR4 ---");
  const docs = await col.find({ 
    $or: [ { content: /AR-4/i }, { text: /AR-4/i }, { content: /AR4/i }, { text: /AR4/i } ] 
  }).toArray();
  
  if (docs.length === 0) {
      console.log("No AR-4 documents found.");
  } else {
      docs.forEach(d => console.log(`[${d.source}] ${d.title}: ${d.content?.slice(0, 100)}`));
  }

  console.log("\n--- Searching for Velachery ---");
  const v = await col.find({ 
    $or: [ { content: /Velachery/i }, { text: /Velachery/i } ] 
  }).limit(10).toArray();
  v.forEach(d => console.log(`[${d.source}] ${d.title}: ${d.content?.slice(0, 100)}`));

  process.exit(0);
}

check();
