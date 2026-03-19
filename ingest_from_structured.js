import fs from 'fs';
import connectDB from './database/mongo.js';
import mongoose from 'mongoose';
import config from './config/config.js';
import { generateEmbedding } from './services/embeddingService.js';
import logger from './utils/logger.js';

async function ingestFromStructured() {
  await connectDB();
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log('--- SYSTEM: STARTING CLEAN RE-EMBED FROM knowledge_structured.txt ---');
  await col.deleteMany({});
  console.log('✅ Collection wiped.');

  const filePath = './knowledge_structured.txt';
  const data = fs.readFileSync(filePath, 'utf8');

  // Split by DOCUMENT_ID blocks
  const blocks = data.split(/--- DOCUMENT_ID: [a-zA-Z0-9]+ ---/).filter(b => b.trim().length > 100);
  console.log(`Found ${blocks.length} documents in structured file.`);

  let success = 0;
  for (let i = 0; i < blocks.length; i++) {
    try {
      const block = blocks[i];
      const lines = block.split('\n');
      
      let title = '', summary = '', content = '', keywords = [], entities = [], query_variations = [];
      let inQueryVariations = false;

      for (const line of lines) {
        if (line.startsWith('TITLE:')) title = line.replace('TITLE:', '').trim();
        else if (line.startsWith('SUMMARY:')) summary = line.replace('SUMMARY:', '').trim();
        else if (line.startsWith('CONTENT:')) content = line.replace('CONTENT:', '').trim();
        else if (line.startsWith('KEYWORDS:')) keywords = line.replace('KEYWORDS:', '').split(',').map(k => k.trim());
        else if (line.startsWith('ENTITIES:')) entities = line.replace('ENTITIES:', '').split(',').map(e => e.trim());
        else if (line.startsWith('QUERY_VARIATIONS:')) {
            inQueryVariations = true;
        } else if (inQueryVariations && line.trim().startsWith('-')) {
            query_variations.push(line.replace('-', '').trim());
        }
      }

      const text = `${title}\n${summary}\n${content}`;
      
      let embedding = null;
      let retries = 0;
      while (!embedding && retries < 6) {
          try {
              embedding = await generateEmbedding(text);
          } catch (e) {
              retries++;
              console.warn(`Embedding failed (attempt ${retries}), retrying in ${retries * 2}s...`);
              await new Promise(r => setTimeout(r, retries * 2000));
          }
      }
      
      if (!embedding) {
          console.error(`Skipping block ${i} due to persistent embedding failure.`);
          continue;
      }
      
      await col.insertOne({
        text,
        content,
        summary,
        title,
        keywords,
        entities,
        query_variations,
        embedding,
        source: 'structured_backup_1536',
        timestamp: new Date().toISOString()
      });

      success++;
      if (success % 10 === 0) console.log(`Ingested ${success}/${blocks.length}...`);
    } catch (e) {
      console.error(`Error ingesting block ${i}: ${e.message}`);
    }
  }

  console.log(`\n✅ RE-EMBED 1536 COMPLETE: ${success} documents ingested into ${config.mongodb.vectorCollection}.`);
  process.exit(0);
}

ingestFromStructured().catch(console.error);
