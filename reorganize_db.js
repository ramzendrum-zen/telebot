import mongoose from 'mongoose';
import config from './config/config.js';

async function reorganizeDB() {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const collection = db.collection(config.mongodb.vectorCollection);
    
    const docs = await collection.find({ category: 'general' }).toArray();
    console.log(`Processing ${docs.length} general docs...`);

    let updated = 0;
    for (const doc of docs) {
        const text = (doc.text || '').toLowerCase();
        let newCat = null;
        
        if (text.includes('alumni') || text.includes('batch:')) {
            newCat = 'alumni';
        } else if (text.includes('nss') || text.includes('yrc') || text.includes('sports') || text.includes('physical education') || text.includes('gym')) {
            newCat = 'extracurricular';
        } else if (text.includes('csi') || text.includes('computer society') || text.includes('skill update')) {
            newCat = 'professional_dev';
        } else if (text.includes('scholarship')) {
            newCat = 'scholarship';
        } else if (text.includes('technology centre') || text.includes('ambulance') || text.includes('located near')) {
            newCat = 'campus';
        } else if (text.includes('department of') || text.includes('it department') || text.includes('cse department')) {
            newCat = 'departments';
        }

        if (newCat) {
            await collection.updateOne({ _id: doc._id }, { $set: { category: newCat } });
            updated++;
        }
    }

    console.log(`Successfully re-categorized ${updated} documents.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reorganizeDB();
