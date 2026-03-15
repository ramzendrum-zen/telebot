/**
 * MSAJCE MASTER INGESTER
 * 
 * Follows the Master Universal Prompt pipeline:
 * Scraping -> Cleaning -> Knowledge Building -> Chunking -> Embedding (3072) -> Vector Storage.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { cleanAndStructureData } from './utils/data_cleaner.js';
import config from './config/config.js';
import logger from './utils/logger.js';

dotenv.config();

/**
 * Knowledge Builder / Enrichment Logic
 * Generates entities, query variations, and synonyms.
 */
async function enrichKnowledge(chunk) {
  const prompt = `You are a MSAJCE Knowledge Engineer. 
Convert this chunk of information into high-precision RAG knowledge.

CHUNK:
"${chunk.content}"

Rules:
1. SEMANTIC RESTRUCTURING: Ensure the content is a full, descriptive natural language statement.
2. REVERSE KNOWLEDGE: Add a "reverse" version of the fact (e.g. if A is B, also say B is A).
3. ENTITIES: Extract names, roles, departments, locations, and routes.
4. QUERY VARIATIONS: Generate 8 unique ways a student might ask for this (vague, short, long, twisted, casual).
5. KEYWORDS: Extract 10 specific terms for exact keyword matching (including acronyms like HOD, OMR).

Output EXACT JSON:
{
  "semantic_content": "Full descriptive statement + reverse fact",
  "entities": ["entity1", "entity2"],
  "keywords": ["key1", "key2"],
  "query_variations": ["how to...", "who is...", "principal", ...]
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openRouter.models.cheap,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    logger.warn(`Enrichment failed for chunk: ${chunk.title}`);
    return null;
  }
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
      "MSAJCE Bus AR-3 starts from T. Nagar at 06:20 AM."
    ]
  },
  {
    route: "AR-5",
    driver: "Mr. Murugan / Mr. Velu",
    phone: "+91-9962254425 / +91-9940050685",
    stops: ["MMDA School (6:15 AM)", "Anna Nagar", "Skywalk", "Saidapet", "Velachery", "OMR", "Ladies Hostel", "College"],
    statements: [
      "The driver for bus route AR-5 is Mr. Murugan (+91-9962254425) or Mr. Velu (+91-9940050685).",
      "Bus route AR-5 full route details: MMDA School (6:15 AM) → Anna Nagar → Skywalk → Saidapet → Velachery → OMR → Ladies Hostel → College.",
      "AR-5 transport route includes stops at MMDA School (6:15 AM), Skywalk, Saidapet, Velachery, OMR, and Ladies Hostel."
    ]
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam (7:10 AM)", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star 7:25 AM)", "Nerkundrum", "Maduravoyal", "Porur (7:45 AM)", "Perungalathur", "College"],
    statements: [
      "The driver for bus route AR-8 is Mr. Raju (+91-9790750906).",
      "Bus route AR-8 FULL ROUTE with all Timings: Manjambakkam (7:10 AM) → Retteri → Senthil Nagar → Anna Nagar (Blue Star 7:25 AM) → Nerkundrum → Maduravoyal → Porur (7:45 AM) → Perungalathur → College.",
      "AR-8 bus route connects Manjambakkam to MSAJCE College via Anna Nagar and Porur."
    ]
  }
];

async function ingestVerifiedKnowledge(col) {
  // Combine Transport and Trust
  const verified = [
    ...transportDetailed.flatMap(item => item.statements.map(s => ({ title: `Bus Route ${item.route}`, content: s, source: "verified_transport", category: "transport", metadata: { route: item.route, phone: item.phone, driver: item.driver } }))),
    {
      title: "Mohamed Sathak Trust Overview",
      content: "The Mohamed Sathak Trust was established in 1973 by the philanthropic Mohamed Sathak Family of Kilakarai, Ramanathapuram District, Tamil Nadu. It aims to provide quality education to rural and financially disadvantaged students.",
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
    const rich = await enrichKnowledge(item);
    const finalContent = rich ? rich.semantic_content : item.content;
    const embedding = await generateEmbedding(finalContent);
    
    await col.insertOne({
      document_id: new mongoose.Types.ObjectId().toString(),
      source: item.source,
      category: item.category,
      title: item.title,
      content: finalContent,
      text: finalContent,
      embedding,
      entities: rich?.entities || [],
      keywords: rich?.keywords || [],
      query_variations: rich?.query_variations || [],
      metadata: { 
          ...item.metadata,
          created_at: new Date().toISOString() 
      }
    });
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("Wiping collection for clean Master Ingestion...");
  await col.deleteMany({});
  
  // 1. Process Scraped Data
  if (fs.existsSync('scraped_data.json')) {
    const scraped = JSON.parse(fs.readFileSync('scraped_data.json'));
    for (const page of scraped) {
      console.log(`Processing Scraped Page: ${page.url}`);
      const chunks = await cleanAndStructureData(page.content);
      for (const chunk of chunks) {
        process.stdout.write(` - Enriching chunk: ${chunk.title}\r`);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit protection
        const rich = await enrichKnowledge(chunk);
        const finalContent = rich ? rich.semantic_content : chunk.content;
        const embedding = await generateEmbedding(finalContent);
        
        await col.insertOne({
           document_id: new mongoose.Types.ObjectId().toString(),
           title: chunk.title,
           content: finalContent,
           text: finalContent,
           category: chunk.category,
           embedding,
           source: "scraped",
           entities: rich?.entities || [],
           keywords: rich?.keywords || chunk.keywords || [],
           query_variations: rich?.query_variations || chunk.query_variations || [],
           metadata: { 
               created_at: new Date().toISOString(), 
               url: page.url
           }
        });
      }
      console.log(`\n ✅ Finished ${page.url}`);
    }
  }

  // 2. Process Verified Knowledge (Transport, Trust)
  await ingestVerifiedKnowledge(col);

  console.log("\n🚀 MASTER INGESTION COMPLETE!");
  process.exit(0);
}

run();
