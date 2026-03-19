import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    const col = mongoose.connection.db.collection(process.env.VECTOR_COLLECTION || 'vector_store');
    
    const indexes = await col.listSearchIndexes().toArray();
    console.log("SEARCH INDEXES:");
    console.log(JSON.stringify(indexes, null, 2));

    const docs = await col.find({}).limit(1).toArray();
    if(docs[0] && docs[0].embedding) {
        console.log("SAMPLE EMBEDDING DIMENSION:", docs[0].embedding.length);
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
