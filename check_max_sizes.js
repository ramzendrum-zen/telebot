import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkMaxSizes() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'msajce' });
  const coll = mongoose.connection.db.collection('vector_store');
  const samples = await coll.find({}).toArray();

  let maxLen = 0;
  let maxTitle = "";
  let totalLen = 0;

  samples.forEach(s => {
    const text = (s.text || s.content || "").length;
    if (text > maxLen) {
      maxLen = text;
      maxTitle = s.title || s._id;
    }
    totalLen += text;
  });

  const avgLen = totalLen / samples.length;
  console.log(`Min: 0, Max: ${maxLen} (${maxTitle}), Avg: ${Math.round(avgLen)} chars.`);
  
  process.exit(0);
}

checkMaxSizes().catch(console.error);
