import mongoose from 'mongoose';
import config from './config/config.js';

async function check() {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    const doc = await db.collection('vector_store').findOne({ embedding: { $exists: true } });
    if (doc) {
        console.log('Document ID:', doc._id);
        console.log('Embedding Dimension:', doc.embedding.length);
        console.log('Sample Text:', (doc.text || doc.content || '').slice(0, 100));
    } else {
        console.log('No documents with embeddings found.');
    }
    process.exit(0);
}

check();
