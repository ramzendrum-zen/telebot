import mongoose from 'mongoose';
import config from './config/config.js';

async function checkDoc() {
    try {
        await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
        const db = mongoose.connection.db;
        const collection = db.collection(config.mongodb.vectorCollection);
        const doc = await collection.findOne({ document_id: 'student_yogesh' });
        console.log(JSON.stringify(doc, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDoc();
