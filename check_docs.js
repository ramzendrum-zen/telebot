import mongoose from 'mongoose';
import config from './config/config.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkIngested() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  const docs = await col.find({ 
    document_id: { $in: ["admin_scholarships", "facility_library", "admin_principal_detailed", "admin_admissions_ug"] } 
  }).toArray();
  
  console.log(`Found ${docs.length} core docs.`);
  docs.forEach(d => console.log(`- ID: ${d.document_id}, Category: ${d.category}, Title: ${d.title}`));
  
  process.exit(0);
}
checkIngested().catch(console.error);
