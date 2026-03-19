import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config/config.js';

dotenv.config();

async function checkLogs() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection('logs'); // Assuming the collection is named 'logs'
  
  console.log("--- Recent Error Logs ---");
  const errors = await col.find({ type: 'error' }).sort({ timestamp: -1 }).limit(10).toArray();
  
  errors.forEach(e => {
      console.log(`[${e.timestamp}] [${e.sub_type}] ${e.message}`);
      console.log(`Payload: ${JSON.stringify(e.payload)}`);
      console.log("---");
  });

  process.exit(0);
}

checkLogs();
