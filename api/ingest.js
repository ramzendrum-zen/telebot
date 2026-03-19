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

    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'knowledge_structured.txt');
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'knowledge_structured.txt not found on server' });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const blocks = data.split(/--- DOCUMENT_ID: [a-f0-9]+ ---/).filter(b => b.trim().length > 50);
    
    let totalIngested = 0;
    for (const block of blocks) {
      try {
        const lines = block.split('\n');
        let title = '', summary = '', content = '', keywords = [], entities = [], query_variations = [];
        let inQueryVars = false;

        for (const line of lines) {
            const l = line.trim();
            if (l.startsWith('TITLE:')) title = l.replace('TITLE:', '').trim();
            else if (l.startsWith('SUMMARY:')) summary = l.replace('SUMMARY:', '').trim();
            else if (l.startsWith('CONTENT:')) content = l.replace('CONTENT:', '').trim();
            else if (l.startsWith('KEYWORDS:')) keywords = l.replace('KEYWORDS:', '').split(',').map(k => k.trim());
            else if (l.startsWith('ENTITIES:')) entities = l.replace('ENTITIES:', '').split(',').map(e => e.trim());
            else if (l.startsWith('QUERY_VARIATIONS:')) inQueryVars = true;
            else if (inQueryVars && l.startsWith('-')) query_variations.push(l.replace('-', '').trim());
            else if (l.length === 0) inQueryVars = false;
        }

        if (!content) continue;

        const textToEmbed = `${title}\n${summary}\n${content}`;
        const embedding = await generateEmbedding(textToEmbed);
        
        await col.insertOne({
            title, summary, content, keywords, entities, query_variations,
            text: textToEmbed,
            embedding,
            source: 'structured_reingest',
            timestamp: new Date().toISOString()
        });
        totalIngested++;

        // Safety break for Vercel timeouts in case of too many blocks
        if (totalIngested >= 150) break; 
      } catch (e) {
        logger.error(`Block ingest error: ${e.message}`);
      }
    }

    res.json({ success: true, count: totalIngested });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
