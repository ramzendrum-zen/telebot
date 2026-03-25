import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { splitContent, cleanAndEnrichChunk } from './services/ingestionService.js';
import config from './config/config.js';
import logger from './utils/logger.js';

dotenv.config();

const KNOWLEDGE_FILE = 'knowledge_structured.txt';

/**
 * Backup Logic: Saves structured knowledge to a text file
 */
function appendToKnowledgeBackup(doc) {
    const entry = `--- DOCUMENT_ID: ${doc.document_id} ---
TIMESTAMP: ${new Date().toISOString()}
TITLE: ${doc.title}
SUMMARY: ${doc.summary || ''}
CATEGORY: ${doc.category}
SOURCE: ${doc.source}
CONTENT: ${doc.content}
KEYWORDS: ${Array.isArray(doc.keywords) ? doc.keywords.join(', ') : (doc.keywords || '')}
ENTITIES: ${Array.isArray(doc.entities) ? doc.entities.join(', ') : (doc.entities || '')}
QUERY_VARIATIONS:
${Array.isArray(doc.query_variations) ? doc.query_variations.map(v => ` - ${v}`).join('\n') : ''}

`;
    fs.appendFileSync(KNOWLEDGE_FILE, entry);
}

/**
 * Ingests raw text (from Manual entry, PDF content, etc.)
 */
export async function ingestTextKnowledge(title, rawContent, source = "manual_text", category = "general") {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

    console.log(`🚀 Starting Ingestion for: ${title}`);
    
    // Step 2: Intelligent Chunking
    const rawChunks = await splitContent(rawContent);
    console.log(`📦 Split into ${rawChunks.length} chunks.`);

    for (let i = 0; i < rawChunks.length; i++) {
        console.log(` - Processing chunk ${i + 1}/${rawChunks.length}`);
        
        // Step 1 & 3: Clean, Normalize, Enrich
        const rich = await cleanAndEnrichChunk(rawChunks[i], { source, title, chunk_index: i });
        
        // Step 4: Embed
        const embedding = await generateEmbedding(rich.content);
        
        const doc = {
            document_id: new mongoose.Types.ObjectId().toString(),
            source,
            category: rich.category || category,
            title: title + (rawChunks.length > 1 ? ` (Part ${i+1})` : ''),
            content: rich.content,
            summary: rich.summary,
            text: rich.content,
            embedding,
            entities: rich.entities || [],
            keywords: rich.keywords || [],
            query_variations: rich.query_variations || [],
            metadata: { 
                ...rich.metadata,
                created_at: new Date().toISOString() 
            }
        };

        await col.insertOne(doc);
        appendToKnowledgeBackup(doc);
        
        // Delay for rate limit
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`\n✅ SUCCESSFULLY INGESTED "${title}"`);
    return true;
  } catch (e) {
    logger.error(`Manual Ingest Error: ${e.message}`);
  } finally {
    await mongoose.disconnect();
  }
}

// CLI Support: node ingest_text.js "Title" "Content"
if (process.argv[2] && process.argv[3]) {
    ingestTextKnowledge(process.argv[2], process.argv[3]);
}
