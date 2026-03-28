import mongoose from 'mongoose';
import config from './config/config.js';

async function reorganizeDB_Phase2() {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);
    
    // Process remaining 'general' docs
    const docs = await collection.find({ category: 'general' }).toArray();
    console.log(`Processing remaining ${docs.length} general docs...`);

    let updated = 0;
    for (const doc of docs) {
        const text = (doc.text || '').toLowerCase();
        let newCat = null;
        
        if (text.includes('admission') || text.includes('intake') || text.includes('fees') || text.includes('eligibility')) {
            newCat = 'admission';
        } else if (text.includes('department of') || text.includes('it department') || text.includes('department of it') || text.includes('it HOD') || text.includes('computer science') || text.includes('mechanical')) {
            newCat = 'departments';
        } else if (text.includes('scholarship') || text.includes('minority') || text.includes('bc/mbc')) {
            newCat = 'scholarship';
        } else if (text.includes('trust') || text.includes('mohamed sathak') || text.includes('institutions')) {
            newCat = 'trust';
        } else if (text.includes('contact') || text.includes('website') || text.includes('address') || text.includes('phone') || text.includes('email')) {
            newCat = 'admin';
        }

        if (newCat) {
            await collection.updateOne({ _id: doc._id }, { $set: { category: newCat } });
            updated++;
        }
    }

    console.log(`Phase 2 complete. Re-categorized ${updated} more documents.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reorganizeDB_Phase2();
