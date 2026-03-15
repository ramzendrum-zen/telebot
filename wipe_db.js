import mongoose from 'mongoose';
import connectDB from './database/mongo.js';
import config from './config/config.js';

async function wipe() {
  await connectDB();
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  console.log("Wiping all vectors...");
  await col.deleteMany({});
  console.log("Wipe complete.");
  process.exit(0);
}

wipe();
