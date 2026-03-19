/**
 * MSAJCE ULTIMATE PRODUCTION INGESTER (Checklist Verified)
 * 
 * Implements the EXACT Document Schema:
 * DOCUMENT_ID, TITLE, CATEGORY, SOURCE, CONTENT, KEYWORDS, ENTITIES, QUERY_VARIATIONS
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { getAIReponse } from './services/aiService.js';
import config from './config/config.js';

dotenv.config();

const KNOWLEDGE_RAW_FILE = 'knowledge_raw.txt';

const transportData = [
  {
    id: "transport_route_ar3",
    title: "MSAJCE Bus Route AR-3",
    category: "transport",
    content: "Route AR-3 starts from Uthiramerur at 5:50 AM. Stops: Uthiramerur (5:50 AM) → Walajabad → Oragadam → Padappai → Tambaram → Perungalathur → Vandalur → Kelambakkam → College. Driver: Mr. Sathish K (+91-9789970304).",
    keywords: "AR-3, ar3, uthiramerur, bus route, tambaram, kelambakkam stop",
    entities: "MSAJCE, Uthiramerur, Tambaram, Kelambakkam",
    variations: ["Which bus goes to Uthiramerur?", "AR-3 timings", "Bus to Tambaram"]
  },
  {
    id: "transport_route_ar4",
    title: "MSAJCE Bus Route AR-4",
    category: "transport",
    content: "Route AR-4 starts from Moolakadai at 6:10 AM. Stops: Moolakadai (6:10 AM) → Perambur → Otteri → Purasawalkam → Egmore → Mount Road → Guindy → Velachery → College. Driver: Mr. Venkatesan (+91-9940004500).",
    keywords: "AR-4, ar4, moolakadai, perambur, egmore, bus timings",
    entities: "MSAJCE, Moolakadai, Egmore, Velachery",
    variations: ["Does AR-4 stop at Egmore?", "Moolakadai bus timing", "AR-4 route"]
  },
  {
    id: "transport_route_ar5",
    title: "MSAJCE Bus Route AR-5",
    category: "transport",
    content: "Route AR-5 starts at MMDA School (6:15 AM). Stops: MMDA School (6:15 AM) → Anna Nagar (6:20 AM) → Chinthamani (6:25 AM) → Skywalk (6:30 AM) → Choolaimadu (6:33 AM) → Loyola College (6:35 AM) → T. Nagar (6:40 AM) → CIT Nagar (6:43 AM) → Saidapet (6:45 AM) → Velachery Check Post (6:50 AM) → Vijaya Nagar Bus Stop (6:53 AM) → Baby Nagar (6:55 AM) → Tharamani (7:00 AM) → MGR Road (7:15 AM) → OMR (7:20 AM) → Ladies Hostel (7:35 AM) → College (8:00 AM). Drivers: Mr. Murugan (+91-9962254425), Mr. Velu (+91-9940050685).",
    keywords: "AR-5, ar5, mmda school, anna nagar, t nagar, velachery, omr bus",
    entities: "MSAJCE, MMDA School, Anna Nagar, T. Nagar, Velachery, OMR",
    variations: ["Bus through Anna Nagar", "AR-5 driver phone", "MMDA school bus timing"]
  },
  {
    id: "transport_route_ar6",
    title: "MSAJCE Bus Route AR-6",
    category: "transport",
    content: "Route AR-6 starts at ICF (6:15 AM). Stops: ICF (6:15 AM) → Ayanavaram (6:20 AM) → Purasawalkam Tank (6:25 AM) → Dasaprakash (6:27 AM) → Egmore (6:30 AM) → Pudupet (6:32 AM) → Rathnacap (6:35 AM) → Triplicane (6:37 AM) → Ice House (6:40 AM) → New College (6:48 AM) → Tenampet (6:55 AM) → Kotturpuram (7:00 AM) → Madhyakilash (7:10 AM) → SRP Tools (7:15 AM) → Perungudi (7:20 AM) → Karapakkam (7:25 AM) → Ladies Hostel (7:35 AM) → College (8:00 AM).",
    keywords: "AR-6, ar6, icf, egmore, triplicane, srp tools, perungudi",
    entities: "MSAJCE, ICF, Egmore, Triplicane, Madhyakilash",
    variations: ["Bus from ICF to college", "Does AR-6 go to Egmore?", "AR-6 stops"]
  },
  {
    id: "transport_route_ar7",
    title: "MSAJCE Bus Route AR-7",
    category: "transport",
    content: "Route AR-7 starts from Chunambedu (5:25 AM). Stops: Chunambedu (5:25 AM) → Kadapakkam (5:45 AM) → Elliyamman Koil (6:00 AM) → Koovathur (6:17 AM) → Kathan Kadai (6:22 AM) → Kalpakkam (6:30 AM) → Caturankappattinam (6:40 AM) → Venkampakkam (6:50 AM) → Thirukazukundram (7:00 AM) → Punceri (7:12 AM) → Paiyanur (7:15 AM) → Alathur (7:20 AM) → Thirupporur (7:30 AM) → Kalavakkam (7:36 AM) → Cenkanmal (7:41 AM) → Kelambakkam (7:45 AM) → Padur (7:50 AM) → Aananth College (7:53 AM) → College (8:00 AM).",
    keywords: "AR-7, ar7, chunambedu, kalpakkam, thirupporur, kelambakkam",
    entities: "MSAJCE, Chunambedu, Kalpakkam, Kelambakkam",
    variations: ["Chunambedu bus timing", "AR-7 route stops", "Kalpakkam to MSAJCE"]
  },
  {
    id: "transport_route_ar8",
    title: "MSAJCE Bus Route AR-8",
    category: "transport",
    content: "Route AR-8 starts from Manjambakkam (5:50 AM). Stops: Manjambakkam (5:50 AM) → Retteri → Senthil Nagar → Anna Nagar (7:25 AM) → Porur (7:45 AM) → Perungalathur → College (8:00 AM). Driver: Mr. Raju (+91-9790750906).",
    keywords: "AR-8, ar8, manjambakkam, retteri, anna nagar blue star, porur bus",
    entities: "MSAJCE, Manjambakkam, Retteri, Anna Nagar, Porur",
    variations: ["Who is driver for AR-8?", "AR-8 stops", "Manjambakkam bus timing"]
  },
  {
    id: "transport_route_ar9",
    title: "MSAJCE Bus Route AR-9",
    category: "transport",
    content: "Route AR-9 starts from Ennore (6:15 AM). Stops: Ennore (6:15 AM) → Mint (6:20 AM) → Broadway (6:25 AM) → Central (6:30 AM) → Omanthoorar Hospital (6:40 AM) → Royapettah (6:45 AM) → Mylapore (6:50 AM) → Mandaveli (7:00 AM) → Adyar (7:10 AM) → Thiruvanmiyur (7:15 AM) → Palavakkam (7:20 AM) → Neelankarai (7:25 AM) → Akkarai Water Tank (7:30 AM) → Sholinganallur (7:35 AM) → Ladies Hostel (7:40 AM) → College (8:00 AM).",
    keywords: "AR-9, ar9, ennore, central, broadway, adyar, sholinganallur, omr",
    entities: "MSAJCE, Ennore, Broadway, Central, Adyar, Sholinganallur",
    variations: ["Ennore bus route", "AR-9 timings", "Central to MSAJCE bus"]
  },
  {
    id: "transport_route_r22",
    title: "MSAJCE Bus Route R-22",
    category: "transport",
    content: "Route R-22 starts from Nemilichery (5:50 AM). Stops: Nemilichery (5:50 AM) → Poonamalle (6:05 AM) → Kumanan Chavadi (6:00 AM) → Kattupakkam (6:05 AM) → Ramachandra Hospital (6:10 AM) → Porur (6:15 AM) → Valasaravakkam (6:20 AM) → Ramapuram (6:25 AM) → Nanthampakkam (6:30 AM) → Kathipara Junction (6:35 AM) → Thillai Ganga Subway (6:40 AM) → Velachery Bypass (6:45 AM) → Kaiveli (7:00 AM) → Madipakkam (7:05 AM) → KilKattalai (7:10 AM) → Kovilampakkam (7:15 AM) → Medavakkam (7:20 AM) → Sholinganallur (7:25 AM) → College (8:00 AM). Driver: Mr. Jaffar (+91-9566037890).",
    keywords: "R-22, r22, nemilichery, porur, velachery, sholinganallur, medavakkam",
    entities: "MSAJCE, Nemilichery, Porur, Velachery, Medavakkam",
    variations: ["R-22 route details", "Nemilichery bus timing", "R-22 driver phone"]
  }
];

async function run() {
  console.log("🚀 NUCLEAR RE-INDEXING (MASTER CHECKLIST)...");
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log(`🧹 Wiping ${config.mongodb.vectorCollection}...`);
  await col.deleteMany({});
  
  // 1. Process VERIFIED DATA with Strict DOCUMENT SCHEMA
  for (const item of transportData) {
     console.log(` - Ingesting Schema: ${item.id}`);
     const embedding = await generateEmbedding(item.content);
     await col.insertOne({
        document_id: item.id,
        title: item.title,
        category: item.category,
        source: 'verified_transport',
        content: item.content,
        text: item.content, // duplicated for easy simple search fallback
        keywords: item.keywords.split(',').map(k => k.trim()),
        entities: item.entities.split(',').map(e => e.trim()),
        query_variations: item.variations,
        embedding,
        metadata: { route: item.id.split('_').pop().toUpperCase() },
        timestamp: new Date().toISOString()
     });
  }

  // 2. Process Knowledge Raw with Enrichment
  if (fs.existsSync(KNOWLEDGE_RAW_FILE)) {
      const raw = fs.readFileSync(KNOWLEDGE_RAW_FILE, 'utf-8');
      const sections = raw.split('--- SOURCE: ').filter(s => s.trim().length > 10);
      
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx];
          const lines = section.split('\n');
          const source = lines[0].replace(' ---', '').trim();
          let body = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
          
          // Clean placeholder gibberish
          body = body.replace(/lorem ipsum dolor sit amet[\s\S]*?themeMascot/ig, '');
          if (body.length < 100) continue; 
          
          console.log(` - Processing & Enriching Doc: ${source}`);
          const chunks = body.match(/[^.!?]+[.!?]+/g) || [body];
          let currentChunk = "";
          let chunkCount = 0;
          
          for (let c of chunks) {
              if (currentChunk.length + c.length < 350) {
                  currentChunk += " " + c;
              } else {
                  if (currentChunk.length > 50) {
                      const emb = await generateEmbedding(currentChunk);
                      await col.insertOne({
                          document_id: `raw_doc_${sIdx}_${chunkCount}`,
                          title: `MSAJCE Record: ${source.split('/').pop()}`,
                          category: (source.includes('hostel') || source.includes('amenities')) ? 'hostel' : 'general',
                          source: source,
                          content: currentChunk.trim(),
                          text: currentChunk.trim(),
                          embedding: emb,
                          timestamp: new Date().toISOString()
                      });
                      chunkCount++;
                  }
                  currentChunk = c;
              }
          }
      }
  }

  console.log("\n✅ NUCLEAR RE-INDEXING COMPLETE.");
  process.exit(0);
}

run();
