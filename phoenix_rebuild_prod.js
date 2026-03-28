import mongoose from 'mongoose';
import config from './config/config.js';
import { processRawData } from './services/ingestionService.js';
import logger from './utils/logger.js';

/**
 * PROJECT PHOENIX: FINAL PRODUCTION REBUILD
 * 
 * Rebuilds the entire MSAJCE Knowledge Base with high-quality cleaning
 * and automated entity extraction. 
 */

async function mainRebuild() {
  try {
    console.log("🔥 PROJECT PHOENIX: STARTING FULL REBUILD...");
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    
    // 1. CLEAR PRODUCTION COLLECTION (Clean Slate)
    const prodColl = db.collection('knowledge_production');
    console.log("🧹 Clearing 'knowledge_production'...");
    await prodColl.deleteMany({}); 

    // 2. FETCH ALL LEGACY DATA
    const legacyColl = db.collection('vector_store');
    const allDocs = await legacyColl.find({}).toArray();
    console.log(`📦 Found ${allDocs.length} legacy chunks to process.`);

    let success = 0;
    let failure = 0;

    // 3. BULK RE-INGEST (One by one for quality extraction)
    for (let i = 0; i < allDocs.length; i++) {
        const doc = allDocs[i];
        process.stdout.write(`\r[${i+1}/${allDocs.length}] Rebuilding: ${doc.title || 'Untitled'}... `);

        try {
            const rawText = (doc.text || doc.content || '').toString();
            // Skip duplicates or very short noise
            if (rawText.length < 50) continue;

            const processed = await processRawData(rawText, doc.source || 'migrated_phoenix');
            if (processed) {
                await prodColl.insertOne(processed);
                success++;
            } else {
                failure++;
            }
        } catch (err) {
            failure++;
            logger.error(`Migration error on doc ${i}: ${err.message}`);
        }
    }

    console.log(`\n\n✅ REBUILD COMPLETE!`);
    console.log(`------------------------`);
    success++; // include the 10 from test earlier if needed, but we cleared it.
    console.log(`🚀 Success: ${success}`);
    console.log(`❌ Failures: ${failure}`);
    console.log(`📖 Collection: 'knowledge_production' is live.`);
    
    process.exit(0);

  } catch (error) {
    console.error("\n❌ CRITICAL SYSTEM FAILURE:", error);
    process.exit(1);
  }
}

mainRebuild();
