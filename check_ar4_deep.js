import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config/config.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("--- Searching for ALL AR-4 chunks ---");
  const docs = await col.find({ 
    $or: [ { content: /AR-4/i }, { content: /AR4/i }, { content: /Venkatesan/i }, { content: /Egmore/i } ] 
  }).toArray();
  
  docs.forEach(d => console.log(`[${d.source}] [ID:${d._id}] ${d.title}: ${d.content}`));
  process.exit(0);
}

check();
