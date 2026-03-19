/**
 * MSAJCE MASTER INGESTER v3 (Senior Architect Edition)
 * 
 * Optimized for 1536-dimensional RAG.
 * Implements Master Data Ingestion Pipeline:
 * Cleaning -> Recursive Chunking (325 chars) -> Enrichment -> Embedding -> Backup.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { splitContent, cleanAndEnrichChunk } from './services/ingestionService.js';
import config from './config/config.js';
import logger from './utils/logger.js';

dotenv.config();

const KNOWLEDGE_STRUCTURED_FILE = 'knowledge_structured.txt';

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
    fs.appendFileSync(KNOWLEDGE_STRUCTURED_FILE, entry);
}

const transportDetailed = [
  {
    route: "AR-3",
    driver: "Mr. Sathish K",
    phone: "+91-9789970304",
    stops: ["T. Nagar (06:20 AM)", "Saidapet", "Guindy", "Velachery", "Medavakkam", "Camp Road", "Mambakkam", "College"],
    statements: [
      "The driver for bus route AR-3 is Mr. Sathish K (+91-9789970304).",
      "Bus route AR-3 full path with timings: T. Nagar (06:20 AM) → Saidapet → Guindy → Velachery → Medavakkam → Camp Road → Mambakkam → College.",
      "T. Nagar college bus starts at 06:20 AM for route AR-3."
    ]
  },
  {
    route: "AR-5",
    driver: "Mr. Murugan / Mr. Velu",
    phone: "+91-9962254425 / +91-9940050685",
    stops: ["MMDA School (6:15 AM)", "Anna Nagar", "Skywalk", "Saidapet", "Velachery", "OMR", "Ladies Hostel", "College"],
    statements: [
      "The driver for bus route AR-5 is Mr. Murugan (+91-9962254425) or Mr. Velu (+91-9940050685).",
      "Bus route AR-5 path: MMDA School (6:15 AM) → Anna Nagar → Skywalk → Saidapet → Velachery → OMR → Ladies Hostel → College.",
      "MMDA school bus starts at 06:15 AM for route AR-5."
    ]
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam (7:10 AM)", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star 7:25 AM)", "Nerkundrum", "Maduravoyal", "Porur (7:45 AM)", "Perungalathur", "College"],
    statements: [
      "The driver for bus route AR-8 is Mr. Raju (+91-9790750906).",
      "Bus route AR-8 path: Manjambakkam (7:10 AM) → Retteri → Senthil Nagar → Anna Nagar (7:25 AM) → Porur (7:45 AM) → Perungalathur → College.",
      "Manjambakkam college bus starts at 07:10 AM for route AR-8."
    ]
  }
];

async function ingestVerifiedKnowledge(col) {
  const verified = [
    ...transportDetailed.flatMap(item => item.statements.map(s => ({ title: `Bus Route ${item.route}`, content: s, source: "verified_transport", category: "transport", metadata: { route: item.route, phone: item.phone, driver: item.driver } }))),
    {
      title: "Mohamed Sathak Trust Overview",
      content: "The Mohamed Sathak Trust was established in 1973 by the philanthropic Mohamed Sathak Family of Kilakarai. It aims to provide quality education to rural and disadvantaged students.",
      source: "verified_trust", category: "general"
    },
    {
      title: "Trust Leadership",
      content: "The Mohamed Sathak Trust is led by Mr. Mohamed Yousuf S.M. (Chairman), Janaba. S.M.H. Sharmila (Secretary), and Janab. P.R.L. Hamid Ibrahim (Executive Director).",
      source: "verified_trust", category: "general"
    }
  ];

  for (const item of verified) {
    console.log(`Ingesting Verified: ${item.title}`);
    const metadata = {
        source_url: "verified_source",
        title: item.title,
        category: item.category,
        timestamp: new Date().toISOString(),
        chunk_index: 0,
        parent_doc_id: new mongoose.Types.ObjectId().toString(),
        ...item.metadata
    };
    let rich, embedding;
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        rich = await cleanAndEnrichChunk(item.content, metadata);
        embedding = await generateEmbedding(rich.content);
        if (embedding && embedding.length === 1536) break;
      } catch (e) {
        retryCount++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    const doc = {
      document_id: new mongoose.Types.ObjectId().toString(),
      source: item.source,
      category: rich.category || item.category,
      title: item.title,
      content: rich.content,
      summary: rich.summary,
      text: rich.content,
      embedding,
      entities: rich.entities || [],
      keywords: rich.keywords || [],
      query_variations: rich.query_variations || [],
      metadata: rich.metadata
    };
    
    await col.insertOne(doc);
    appendToKnowledgeBackup(doc);
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("Wiping collection for clean Master Ingestion...");
  await col.deleteMany({});
  
  // Reset backup file
  fs.writeFileSync(KNOWLEDGE_STRUCTURED_FILE, "");

  // 1. Process Scraped Data
  if (fs.existsSync('scraped_data.json')) {
    const scraped = JSON.parse(fs.readFileSync('scraped_data.json'));
    for (const page of scraped) {
      console.log(`Processing Scraped Page: ${page.url}`);
      
      // Step 2: Intelligent Chunking (Optimized for Small RAG)
      const rawChunks = splitContent(page.content, 325, 60);
      
      for (let i = 0; i < rawChunks.length; i++) {
        const chunkText = rawChunks[i];
        console.log(` - Processing chunk ${i+1}/${rawChunks.length}`);
        
        // Step 1 & 3: Clean, Normalize, Enrich
        const metadata = { 
            source_url: page.url, 
            title: page.title || "Untitled College Page",
            category: "scraped",
            timestamp: new Date().toISOString(),
            chunk_index: i,
            parent_doc_id: new mongoose.Types.ObjectId().toString()
        };

        // Step 1, 3 & 4 with retry
        let rich, embedding;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                rich = await cleanAndEnrichChunk(chunkText, metadata);
                embedding = await generateEmbedding(rich.content);
                if (embedding && embedding.length === 1536) break;
            } catch (e) {
                retryCount++;
                console.log(` ⚠️ Retry ${retryCount}/${maxRetries} for chunk ${i+1}...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!embedding || embedding.every(v => v === 0)) {
            console.log(` ❌ Skipping chunk ${i+1} due to persistent error.`);
            continue;
        }
        
        const doc = {
           document_id: new mongoose.Types.ObjectId().toString(),
           title: metadata.title,
           content: rich.content,
           summary: rich.summary,
           text: rich.content,
           category: rich.category || metadata.category,
           embedding,
           source: metadata.category,
           entities: rich.entities || [],
           keywords: rich.keywords || [],
           query_variations: rich.query_variations || [],
           metadata: rich.metadata
        };

        await col.insertOne(doc);
        appendToKnowledgeBackup(doc);
        
        // Minor delay for rate limit protection
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // 2. Process Verified Knowledge
  await ingestVerifiedKnowledge(col);

  console.log("\n🚀 MASTER INGESTION COMPLETE!");
  process.exit(0);
}

run();
