import mongoose from 'mongoose';
import config from './config/config.js';

async function dumpComplaints() {
  await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
  const col = mongoose.connection.db.collection('complaints');
  const all = await col.find({}).toArray();
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

dumpComplaints().catch(console.error);
