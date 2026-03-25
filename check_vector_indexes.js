import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'msajce';
const COLLECTION_NAME = 'vector_store';

async function checkVectorIndexes() {
  try {
    const conn = await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    const db = conn.connection.db;
    const collection = db.collection(COLLECTION_NAME);

    console.log("--- Vector Store Indexes ---");
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    const count = await collection.countDocuments();
    console.log(`\nTotal Documents in ${COLLECTION_NAME}: ${count}`);

    const sample = await collection.findOne();
    if (sample) {
      console.log("\nSample Document Keys:", Object.keys(sample));
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkVectorIndexes();
