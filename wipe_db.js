import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config/config.js';

dotenv.config();

async function wipe() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("Wiping vector_store...");
  const res = await col.deleteMany({});
  console.log(`Deleted ${res.deletedCount} documents.`);
  
  process.exit(0);
}

wipe();
