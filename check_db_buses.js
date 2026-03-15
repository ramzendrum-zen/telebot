import mongoose from 'mongoose';
import connectDB from './database/mongo.js';
import config from './config/config.js';

async function check() {
  await connectDB();
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("--- AR-5 Documents ---");
  const ar5 = await col.find({ 
    $or: [
      { content: /AR-5/i },
      { text: /AR-5/i },
      { title: /AR-5/i }
    ]
  }).toArray();
  ar5.forEach(d => console.log(`[${d.source}] ${d.title}: ${d.content || d.text}`));

  console.log("\n--- AR-8 Documents ---");
  const ar8 = await col.find({ 
    $or: [
      { content: /AR-8/i },
      { text: /AR-8/i },
      { title: /AR-8/i }
    ]
  }).toArray();
  ar8.forEach(d => console.log(`[${d.source}] ${d.title}: ${d.content || d.text}`));

  process.exit(0);
}

check();
