import mongoose from 'mongoose';
import config from './config/config.js';
import { processRawData } from './services/ingestionService.js';
import logger from './utils/logger.js';

async function testPhoenix() {
  try {
    console.log("🧪 Testing Phoenix Ingestion...");
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    
    // 1. Clear new collection for test (it's safe, it's a new name)
    const prodColl = db.collection('knowledge_production');
    await prodColl.deleteMany({}); 

    // 2. Fetch sample from legacy
    const legacyColl = db.collection('vector_store');
    const samples = await legacyColl.find({}).limit(10).toArray();

    console.log(`📦 Fetched ${samples.length} samples.`);

    for (const sample of samples) {
        process.stdout.write(`Processing: ${sample.title || 'Doc'}... `);
        const text = (sample.text || sample.content || '');
        const processed = await processRawData(text, sample.source || 'migration_test');
        
        if (processed) {
            await prodColl.insertOne(processed);
            console.log("DONE ✅");
        } else {
            console.log("FAILED ❌");
        }
    }

    console.log("\n🧪 Test Complete. Check 'knowledge_production' in Atlas.");
    process.exit(0);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testPhoenix();
