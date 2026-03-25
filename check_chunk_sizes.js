import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkChunkSizes() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'msajce' });
  const coll = mongoose.connection.db.collection('vector_store');
  const samples = await coll.find({}).sort({ _id: -1 }).limit(10).toArray();

  samples.forEach(s => {
    const text = s.text || s.content || "";
    console.log(`Document [${s.title || s._id}] - Length: ${text.length} chars (~${Math.round(text.length / 4)} tokens)`);
  });
  
  process.exit(0);
}

checkChunkSizes().catch(console.error);
