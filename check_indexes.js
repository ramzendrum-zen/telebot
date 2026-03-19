import mongoose from 'mongoose';
import config from './config/config.js';

async function checkIndexes() {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  const indexes = await mongoose.connection.db.collection('complaints').indexes();
  console.log("Indexes for complaints:");
  console.log(JSON.stringify(indexes, null, 2));
  
  const sample = await mongoose.connection.db.collection('complaints').findOne({});
  console.log("Sample document keys:", Object.keys(sample));
  
  process.exit(0);
}

checkIndexes().catch(console.error);
