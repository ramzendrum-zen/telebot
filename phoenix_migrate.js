import mongoose from 'mongoose';
import config from './config/config.js';
import { getAIReponse } from './services/aiService.js';
import { generateEmbedding } from './services/embeddingService.js';
import logger from './utils/logger.js';

/**
 * PROJECT PHOENIX: DATABASE MIGRATION & CLEANSING SCRIPT
 * 
 * Objectives:
 * 1. Read from 'vector_store' (Legacy)
 * 2. Clean 'text' of boilerplate/headers
 * 3. Extract structured entities (Names, Roles, Depts) using LLM
 * 4. Generate fresh 1536 embeddings
 * 5. Write to 'knowledge_v3' (Production)
 */

async function phoenixMigration() {
  try {
    console.log("🔥 Starting Project Phoenix Migration...");
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const db = mongoose.connection.db;
    
    const legacyColl = db.collection('vector_store');
    const prodColl = db.collection('knowledge_production'); // The new destination

    // Optional: Drop prod collection for fresh start if user requested "from scratch"
    // await prodColl.drop().catch(() => null);

    const docs = await legacyColl.find({}).toArray();
    console.log(`📦 Found ${docs.length} documents in legacy store.`);

    let processed = 0;
    for (const doc of docs) {
        processed++;
        process.stdout.write(`\rPROCESSED: ${processed}/${docs.length} | Current: ${doc.title || 'Untitled'}...   `);

        // 1. DATA CLEANSING (Strip headers/noise)
        let cleanText = (doc.text || doc.content || '').toString()
            .replace(/--- DOCUMENT_ID: [\w\d]+ ---/gi, '')
            .replace(/TIMESTAMP: .+/gi, '')
            .replace(/TITLE: .+/gi, '')
            .replace(/KEYWORDS: .+/gi, '')
            .replace(/ENTITIES: .+/gi, '')
            .replace(/QUERY_VARIATIONS: .+/gi, '')
            .trim();

        if (cleanText.length < 30) continue; // Skip near-empty/trash chunks

        // 2. ENTITY & SCHEMA EXTRACTION (Using Advanced Model)
        const extractionPrompt = `
Analyze the following text from MSAJCE College and extract structured details.

Text: "${cleanText}"

Output JSON only:
{
  "cleaned_content": "The original text but even more polished and professional",
  "entity_name": "Full name of person if mentioned, else null",
  "entity_role": "Their precise role (e.g. HOD, Driver, Principal, Student President), else null",
  "department": "IT, CSE, Transport, Admin, etc, else null",
  "category": "staff | student | admission | transport | infrastructure | campus",
  "tags": ["extracted", "keywords", "for", "search"]
}
        `;

        let structuredData;
        try {
            const aiResponse = await getAIReponse(extractionPrompt, 'cheap'); // 'cheap' is enough for extraction if prompt is good
            const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
            structuredData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            // Fallback for AI failure
            structuredData = { 
                cleaned_content: cleanText, 
                entity_name: doc.metadata?.name || null, 
                entity_role: doc.metadata?.role || null,
                category: doc.category || 'general',
                tags: []
            };
        }

        // 3. GENERATE FRESH EMBEDDING
        const embedding = await generateEmbedding(structuredData.cleaned_content, 'document');

        // 4. WRITE TO PRODUCTION
        const newDoc = {
            content: structuredData.cleaned_content,
            category: structuredData.category,
            metadata: {
                name: structuredData.entity_name,
                role: structuredData.entity_role,
                department: structuredData.department,
                tags: structuredData.tags,
                source: doc.source || 'migrated_phoenix',
                legacy_id: doc._id.toString()
            },
            embedding,
            created_at: new Date()
        };

        await prodColl.insertOne(newDoc);
    }

    console.log("\n✅ Project Phoenix Migration Complete!");
    console.log("👉 New collection 'knowledge_production' is ready.");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Migration Failed:", error);
    process.exit(1);
  }
}

phoenixMigration();
