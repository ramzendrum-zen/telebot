import connectDB from './database/mongo.js';
import mongoose from 'mongoose';
import config from './config/config.js';

async function testVect() {
    await connectDB();
    const db = mongoose.connection.db;
    const coll = db.collection(config.mongodb.vectorCollection);
    
    // Creating a dummy embedding of size 1024
    const v1024 = new Array(1024).fill(0.1);
    
    console.log("Testing 1024 dimensions...");
    try {
        const res = await coll.aggregate([
            {
                "$vectorSearch": {
                    "index": config.mongodb.vectorIndex,
                    "path": "embedding",
                    "queryVector": v1024,
                    "numCandidates": 10,
                    "limit": 1
                }
            }
        ]).toArray();
        console.log("1024 dimensions: SUCCESS");
    } catch(e) {
        console.log("1024 dimensions: FAILED", e.message);
    }
    
    // Testing 1536
    const v1536 = new Array(1536).fill(0.1);
    console.log("Testing 1536 dimensions...");
    try {
        const res = await coll.aggregate([
            {
                "$vectorSearch": {
                    "index": config.mongodb.vectorIndex,
                    "path": "embedding",
                    "queryVector": v1536,
                    "numCandidates": 10,
                    "limit": 1
                }
            }
        ]).toArray();
        console.log("1536 dimensions: SUCCESS");
    } catch(e) {
        console.log("1536 dimensions: FAILED", e.message);
    }
    
    // Testing 3072
    const v3072 = new Array(3072).fill(0.1);
    console.log("Testing 3072 dimensions...");
    try {
        const res = await coll.aggregate([
            {
                "$vectorSearch": {
                    "index": config.mongodb.vectorIndex,
                    "path": "embedding",
                    "queryVector": v3072,
                    "numCandidates": 10,
                    "limit": 1
                }
            }
        ]).toArray();
        console.log("3072 dimensions: SUCCESS");
    } catch(e) {
        console.log("3072 dimensions: FAILED", e.message);
    }
    
    process.exit(0);
}

testVect().catch(console.error);
