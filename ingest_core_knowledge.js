import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import config from './config/config.js';
import { generateEmbedding } from './services/embeddingService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  const files = ['knowledge_structured.txt', 'knowledge_raw.txt' ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    console.log(`Ingesting ${file}...`);
    const content = fs.readFileSync(file, 'utf8');
    
    // Split by blocks or fixed size
    const blocks = content.split(/\n\n+|CONTENT:/g).filter(b => b.trim().length > 50);

    for (const b of blocks) {
        const text = b.trim();
        const embedding = await generateEmbedding(text);
        
        await col.insertOne({
            source: "college_source",
            category: "general",
            title: `MSAJCE Knowledge: ${text.slice(0, 30)}...`,
            content: text,
            text: text,
            embedding,
            metadata: { file, timestamp: new Date().toISOString() }
        });
        process.stdout.write(".");
    }
    console.log(`\nFinished ${file}.`);
  }

  process.exit(0);
}

run();
