/**
 * MSAJCE TURBO INGESTOR v4 (Senior Architect Edition)
 * Optimized for High-Speed 1536-dimensional RAG.
 * Ingests ALL "Whole Data" from knowledge_raw.txt + Verified Transport.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { splitContent } from './services/ingestionService.js';
import config from './config/config.js';
import logger from './utils/logger.js';

dotenv.config();

const KNOWLEDGE_RAW_FILE = 'knowledge_raw.txt';
const transportDetailed = [
  {
    route: "AR-3",
    driver: "Mr. Sathish K",
    phone: "+91-9789970304",
    stops: ["T. Nagar (06:20 AM)", "Saidapet", "Guindy", "Velachery", "Medavakkam", "Camp Road", "Mambakkam", "College"],
    content: "The driver for bus route AR-3 is Mr. Sathish K (+91-9789970304). Path: T. Nagar (06:20 AM) → Saidapet → Guindy → Velachery → Medavakkam → Camp Road → Mambakkam → College."
  },
  {
    route: "AR-5",
    driver: "Mr. Murugan / Mr. Velu",
    phone: "+91-9962254425 / +91-9940050685",
    stops: ["MMDA School (6:15 AM)", "Anna Nagar", "Skywalk", "Saidapet", "Velachery", "OMR", "Ladies Hostel", "College"],
    content: "The driver for bus route AR-5 is Mr. Murugan (+91-9962254425) or Mr. Velu (+91-9940050685). Path: MMDA School (6:15 AM) → Anna Nagar → Skywalk → Saidapet → Velachery → OMR → Ladies Hostel → College."
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam (7:10 AM)", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star 7:25 AM)", "Nerkundrum", "Maduravoyal", "Porur (7:45 AM)", "Perungalathur", "College"],
    content: "The driver for bus route AR-8 is Mr. Raju (+91-9790750906). Path: Manjambakkam (7:10 AM) → Retteri → Senthil Nagar → Anna Nagar (7:25 AM) → Porur (7:45 AM) → Perungalathur → College."
  }
];

async function run() {
  console.log("🚀 Initializing Master Data Ingestion (1536-dim)...");
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log(`🧹 Wiping ${config.mongodb.vectorCollection}...`);
  await col.deleteMany({});
  
  // 1. Process Transports (High Priority)
  for (const item of transportDetailed) {
     console.log(` - Ingesting Verified Transport: ${item.route}`);
     const embedding = await generateEmbedding(item.content);
     await col.insertOne({
        title: `Bus Route ${item.route}`,
        content: item.content,
        text: item.content,
        category: 'transport',
        source: 'verified_transport',
        embedding,
        metadata: { route: item.route, driver: item.driver, phone: item.phone },
        timestamp: new Date().toISOString()
     });
  }

  // 2. Process Master Raw Knowledge
  if (fs.existsSync(KNOWLEDGE_RAW_FILE)) {
    const raw = fs.readFileSync(KNOWLEDGE_RAW_FILE, 'utf-8');
    const sections = raw.split('--- SOURCE: ').filter(s => s.trim().length > 10);
    
    for (const section of sections) {
        const lines = section.split('\n');
        const sourceUrl = lines[0].replace(' ---', '').trim();
        const bodyContent = lines.slice(1).join('\n').trim();
        const title = sourceUrl.split('/').pop() || "Portal Info";
        
        console.log(` - Processing Master Document: ${sourceUrl}`);
        const chunks = splitContent(bodyContent, 450, 100);
        
        for (let i = 0; i < chunks.length; i++) {
           const chunk = chunks[i];
           const embedding = await generateEmbedding(chunk);
           if (!embedding) continue;

           await col.insertOne({
              title,
              content: chunk,
              text: chunk,
              category: sourceUrl.includes('hostel') ? 'hostel' : (sourceUrl.includes('transport') ? 'transport' : 'general'),
              source: 'master_raw',
              embedding,
              metadata: { source: sourceUrl, chunk: i },
              timestamp: new Date().toISOString()
           });
        }
    }
  }

  console.log("\n✅ MASTER INGESTION COMPLETE! 1536-DIM READY.");
  process.exit(0);
}

run();
