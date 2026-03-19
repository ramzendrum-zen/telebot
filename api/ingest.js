import mongoose from 'mongoose';
import fs from 'fs';
import { generateEmbedding } from '../services/embeddingService.js';
import { splitContent, cleanAndEnrichChunk } from '../services/ingestionService.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Use POST');
  
  try {
    const { pass } = req.body;
    if (pass !== 'admin123') return res.status(403).send('Forbidden');

    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
    
    // Wipe if requested
    if (req.body.wipe) {
        await col.deleteMany({});
        logger.info('Collection wiped');
    }

    const scrapedData = JSON.parse(fs.readFileSync('./scraped_data.json', 'utf8'));
    let totalIngested = 0;

    for (const page of scrapedData) {
      const chunks = splitContent(page.content, 350, 60);
      for (let i = 0; i < chunks.length; i++) {
        try {
            const metadata = { source: page.url, title: page.title, index: i };
            const rich = await cleanAndEnrichChunk(chunks[i], metadata);
            const embedding = await generateEmbedding(rich.content);
            
            await col.insertOne({
                ...rich,
                embedding,
                text: rich.content,
                timestamp: new Date().toISOString()
            });
            totalIngested++;
        } catch (e) {
            logger.error(`Ingest failed for ${page.url} chunk ${i}: ${e.message}`);
        }
      }
    }

    res.json({ success: true, count: totalIngested });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
