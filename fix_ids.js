import mongoose from 'mongoose';
import config from './config/config.js';

async function updateIds() {
    try {
        await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
        const db = mongoose.connection.db;
        const collection = db.collection(config.mongodb.vectorCollection);
        
        await collection.updateMany({ text: /Abdul Gafoor/i }, { $set: { document_id: 'staff_abdul_gafoor' } });
        await collection.updateMany({ text: /Yogesh R/i }, { $set: { document_id: 'student_yogesh' } });
        
        console.log("Updated document_ids for key entities.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateIds();
