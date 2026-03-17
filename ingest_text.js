import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { getAIReponse } from './services/aiService.js';
import config from './config/config.js';
import logger from './utils/logger.js';
import path from 'path';

dotenv.config();

const KNOWLEDGE_FILE = 'knowledge_structured.txt';

/**
 * Appends structured text to the backup file.
 * Format mimics vector DB structure for readability and easy re-ingestion.
 */
function appendToKnowledgeBackup(doc) {
    const entry = `--- DOCUMENT_ID: ${doc.document_id} ---
TIMESTAMP: ${new Date().toISOString()}
TITLE: ${doc.title}
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
 * AI Enrichment logic for generic chunks
 */
async function enrichContent(title, content) {
  const prompt = `You are a MSAJCE Knowledge Engineer. 
Convert this information into high-precision RAG knowledge.

TITLE: "${title}"
CONTENT: "${content}"

Rules:
1. SEMANTIC RESTRUCTURING: Ensure the content is a full, descriptive natural language statement.
2. ENTITIES: Extract names, roles, departments, locations, routes.
3. QUERY VARIATIONS: Generate 8 unique ways a student might ask for this.
4. KEYWORDS: Extract 10 specific terms.

Output EXACT JSON:
{
  "semantic_content": "Full descriptive statement",
  "entities": ["entity1", "entity2"],
  "keywords": ["key1", "key2"],
  "query_variations": ["how to...", "who is...", ...]
}`;

  try {
    const raw = await getAIReponse(prompt, 'cheap');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    logger.warn(`Enrichment failed for: ${title}`);
    return null;
  }
}

/**
 * Ingests a new text document, enriches it, saves to DB and Backup.
 */
export async function ingestTextKnowledge(title, content, source = "manual_text", category = "general") {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

    console.log(`Ingesting Knowledge: ${title}`);
    const rich = await enrichContent(title, content);
    const finalContent = rich ? rich.semantic_content : content;
    const embedding = await generateEmbedding(finalContent);
    
    const doc = {
      document_id: new mongoose.Types.ObjectId().toString(),
      source,
      category,
      title,
      content: finalContent,
      text: finalContent,
      embedding,
      entities: rich?.entities || [],
      keywords: rich?.keywords || [],
      query_variations: rich?.query_variations || [],
      metadata: { 
          created_at: new Date().toISOString() 
      }
    };

    await col.insertOne(doc);
    appendToKnowledgeBackup(doc);
    
    console.log(`✅ Ingested and Backup updated.`);
    return doc.document_id;
  } catch (e) {
    logger.error(`Ingest Error: ${e.message}`);
  } finally {
    // Keep connection if part of a loop, but here we close for one-offs
    await mongoose.disconnect();
  }
}

// CLI Support: node ingest_text.js "Title" "Content"
if (process.argv[2] && process.argv[3]) {
    ingestTextKnowledge(process.argv[2], process.argv[3]);
}
