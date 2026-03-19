/**
 * MSAJCE FINAL PRODUCTION INGESTER v6
 * 
 * Reads from knowledge_structured.txt (133 pre-structured docs) + verified data.
 * Implements full DOCUMENT SCHEMA: TITLE, CATEGORY, SOURCE, CONTENT, KEYWORDS, ENTITIES, QUERY_VARIATIONS
 */

import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import config from './config/config.js';

dotenv.config();

const STRUCTURED_FILE = 'knowledge_structured.txt';
const RAW_FILE = 'knowledge_raw.txt';

// Verified transport data with full DOCUMENT SCHEMA
const verifiedTransport = [
  {
    document_id: "transport_route_ar3",
    title: "MSAJCE Bus Route AR-3",
    category: "transport",
    content: "Route AR-3 starts from Uthiramerur at 5:50 AM. Stops: Uthiramerur (5:50 AM) → Walajabad → Oragadam → Padappai → Tambaram → Perungalathur → Vandalur → Kelambakkam → College (8:00 AM). Driver: Mr. Sathish K (+91-9789970304).",
    keywords: ["AR-3", "ar3", "uthiramerur", "tambaram", "kelambakkam", "bus driver"],
    entities: ["MSAJCE", "Uthiramerur", "Tambaram", "Kelambakkam", "Sathish K"],
    query_variations: ["Which bus goes to Uthiramerur?", "AR-3 timings", "Bus to Tambaram", "AR-3 driver"]
  },
  {
    document_id: "transport_route_ar4",
    title: "MSAJCE Bus Route AR-4",
    category: "transport",
    content: "Route AR-4 starts from Moolakadai at 6:10 AM. Stops: Moolakadai (6:10 AM) → Perambur → Otteri → Purasawalkam → Egmore → Mount Road → Guindy → Velachery → College (8:00 AM). Driver: Mr. Venkatesan.",
    keywords: ["AR-4", "ar4", "moolakadai", "perambur", "egmore", "velachery"],
    entities: ["MSAJCE", "Moolakadai", "Egmore", "Velachery"],
    query_variations: ["Does AR-4 stop at Egmore?", "Moolakadai bus timing", "AR-4 route stops"]
  },
  {
    document_id: "transport_route_ar5",
    title: "MSAJCE Bus Route AR-5",
    category: "transport",
    content: "Route AR-5 starts at MMDA School (6:15 AM). Full stops: MMDA School (6:15 AM) → Anna Nagar (6:20 AM) → Chinthamani (6:25 AM) → Skywalk (6:30 AM) → Choolaimadu (6:33 AM) → Loyola College (6:35 AM) → T. Nagar (6:40 AM) → CIT Nagar (6:43 AM) → Saidapet (6:45 AM) → Velachery Check Post (6:50 AM) → Vijaya Nagar Bus Stop (6:53 AM) → Baby Nagar (6:55 AM) → Tharamani (7:00 AM) → MGR Road (7:15 AM) → OMR (7:20 AM) → Ladies Hostel (7:35 AM) → College (8:00 AM). Drivers: Mr. Murugan (+91-9962254425), Mr. Velu (+91-9940050685).",
    keywords: ["AR-5", "ar5", "mmda school", "anna nagar", "t nagar", "velachery", "omr", "mmda"],
    entities: ["MSAJCE", "MMDA School", "Anna Nagar", "T. Nagar", "Velachery", "OMR"],
    query_variations: ["Bus through Anna Nagar", "AR-5 driver phone", "MMDA school bus timing", "Which bus stops at T.Nagar?"]
  },
  {
    document_id: "transport_route_ar6",
    title: "MSAJCE Bus Route AR-6",
    category: "transport",
    content: "Route AR-6 starts at ICF (6:15 AM). Full stops: ICF (6:15 AM) → Ayanavaram (6:20 AM) → Purasawalkam Tank (6:25 AM) → Dasaprakash (6:27 AM) → Egmore (6:30 AM) → Pudupet (6:32 AM) → Rathnacap (6:35 AM) → Triplicane (6:37 AM) → Ice House (6:40 AM) → New College (6:48 AM) → Tenampet (6:55 AM) → Kotturpuram (7:00 AM) → Madhyakilash (7:10 AM) → SRP Tools (7:15 AM) → Perungudi (7:20 AM) → Karapakkam (7:25 AM) → Ladies Hostel (7:35 AM) → College (8:00 AM).",
    keywords: ["AR-6", "ar6", "icf", "egmore", "triplicane", "srp tools", "perungudi"],
    entities: ["MSAJCE", "ICF", "Egmore", "Triplicane", "Madhyakilash"],
    query_variations: ["Bus from ICF to college", "Does AR-6 go via Egmore?", "AR-6 stops and timings", "Triplicane to MSAJCE bus"]
  },
  {
    document_id: "transport_route_ar7",
    title: "MSAJCE Bus Route AR-7",
    category: "transport",
    content: "Route AR-7 starts from Chunambedu (5:25 AM). Full stops: Chunambedu (5:25 AM) → Kadapakkam (5:45 AM) → Elliyamman Koil (6:00 AM) → Koovathur (6:17 AM) → Kathan Kadai (6:22 AM) → Kalpakkam (6:30 AM) → Caturankappattinam (6:40 AM) → Venkampakkam (6:50 AM) → Thirukazukundram (7:00 AM) → Punceri (7:12 AM) → Paiyanur (7:15 AM) → Alathur (7:20 AM) → Thirupporur (7:30 AM) → Kalavakkam (7:36 AM) → Cenkanmal (7:41 AM) → Kelambakkam (7:45 AM) → Padur (7:50 AM) → Aananth College (7:53 AM) → College (8:00 AM).",
    keywords: ["AR-7", "ar7", "chunambedu", "kalpakkam", "thirupporur", "kelambakkam"],
    entities: ["MSAJCE", "Chunambedu", "Kalpakkam", "Kelambakkam", "Thirupporur"],
    query_variations: ["Chunambedu bus timing", "AR-7 route stops", "Kalpakkam to MSAJCE bus"]
  },
  {
    document_id: "transport_route_ar8",
    title: "MSAJCE Bus Route AR-8",
    category: "transport",
    content: "Route AR-8 starts from Manjambakkam (5:50 AM). Stops: Manjambakkam (5:50 AM) → Retteri → Senthil Nagar → Anna Nagar Blue Star (7:25 AM) → Nerkundrum → Maduravoyal → Porur (7:45 AM) → Perungalathur → College (8:00 AM). Driver: Mr. Raju (+91-9790750906).",
    keywords: ["AR-8", "ar8", "manjambakkam", "retteri", "anna nagar", "porur"],
    entities: ["MSAJCE", "Manjambakkam", "Retteri", "Anna Nagar", "Porur", "Mr. Raju"],
    query_variations: ["Who is the driver for AR-8?", "AR-8 stops", "Manjambakkam bus timing", "AR-8 driver phone number"]
  },
  {
    document_id: "transport_route_ar9",
    title: "MSAJCE Bus Route AR-9",
    category: "transport",
    content: "Route AR-9 starts from Ennore (6:15 AM). Full stops: Ennore (6:15 AM) → Mint (6:20 AM) → Broadway (6:25 AM) → Central (6:30 AM) → Omanthoorar Hospital (6:40 AM) → Royapettah (6:45 AM) → Mylapore (6:50 AM) → Mandaveli (7:00 AM) → Adyar (7:10 AM) → Thiruvanmiyur (7:15 AM) → Palavakkam (7:20 AM) → Neelankarai (7:25 AM) → Akkarai Water Tank (7:30 AM) → Sholinganallur (7:35 AM) → Ladies Hostel (7:40 AM) → College (8:00 AM).",
    keywords: ["AR-9", "ar9", "ennore", "broadway", "central", "adyar", "sholinganallur"],
    entities: ["MSAJCE", "Ennore", "Broadway", "Central", "Adyar", "Sholinganallur"],
    query_variations: ["Ennore bus to MSAJCE", "AR-9 timings", "Which bus stops at Adyar?"]
  },
  {
    document_id: "transport_route_r22",
    title: "MSAJCE Bus Route R-22",
    category: "transport",
    content: "Route R-22 starts from Nemilichery (5:50 AM). Full stops: Nemilichery (5:50 AM) → Poonamalle (6:05 AM) → Kumanan Chavadi → Kattupakkam (6:05 AM) → Ramachandra Hospital (6:10 AM) → Porur (6:15 AM) → Valasaravakkam (6:20 AM) → Ramapuram (6:25 AM) → Nanthampakkam (6:30 AM) → Kathipara Junction (6:35 AM) → Thillai Ganga Subway (6:40 AM) → Velachery Bypass (6:45 AM) → Kaiveli (7:00 AM) → Madipakkam (7:05 AM) → KilKattalai (7:10 AM) → Kovilampakkam (7:15 AM) → Medavakkam (7:20 AM) → Sholinganallur (7:25 AM) → College (8:00 AM). Driver: Mr. Jaffar (+91-9566037890).",
    keywords: ["R-22", "r22", "nemilichery", "porur", "velachery", "medavakkam", "sholinganallur"],
    entities: ["MSAJCE", "Nemilichery", "Porur", "Velachery", "Medavakkam", "Mr. Jaffar"],
    query_variations: ["R-22 route details", "Nemilichery bus timing", "R-22 driver phone", "Velachery to college bus"]
  },
  {
    document_id: "trust_institutions_list",
    title: "Mohamed Sathak Trust Institutions",
    category: "general",
    content: "The Mohamed Sathak Trust has 18 educational institutions in Kilakarai, Ramanathapuram, and Chennai. Colleges under the Sathak Trust: In Kilakarai: (1) Mohamed Sathak Polytechnic College, (2) Mohamed Sathak Engineering College (MSEC), (3) Syed Hameedha Arabic College, (4) Syed Hameedha Arts & Science College. In Chennai: (5) Mohamed Sathak College of Arts & Science, (6) Mohamed Sathak A.J. College of Pharmacy, (7) Mohamed Sathak A.J. College of Engineering (MSAJCE), (8) Mohamed Sathak A.J. College of Nursing, (9) Mohamed Sathak A.J. College of Physiotherapy, (10) Mohamed Sathak Teacher Training College, (11) Mohamed Sathak A.J. Academy of Architecture. The trust covers Engineering, Technology, Arts, Science, Pharmacy, Physiotherapy, Nursing, and Medical Sciences.",
    keywords: ["sathak trust", "institutions", "colleges", "list", "18", "engineering college", "nursing", "pharmacy"],
    entities: ["Mohamed Sathak Trust", "MSEC", "MSAJCE", "Kilakarai", "Syed Hameedha"],
    query_variations: ["How many colleges under Sathak Trust?", "List all Sathak Trust institutions", "Sathak Trust college names", "Which colleges are under Mohamed Sathak Trust?", "All colleges in Sathak group"]
  }
];

// Parse a structured document block into fields
function parseDocBlock(block) {
  const fields = {
    title: '', category: 'general', source: 'knowledge_structured',
    content: '', keywords: [], entities: [], query_variations: [], summary: ''
  };
  
  let currentField = null;
  const lines = block.split('\n');
  
  for (const line of lines) {
    const fieldMatch = line.match(/^(TITLE|CATEGORY|SOURCE|CONTENT|KEYWORDS|ENTITIES|QUERY_VARIATIONS|SUMMARY|TIMESTAMP):\s*(.*)/);
    if (fieldMatch) {
      currentField = fieldMatch[1].toLowerCase().replace('query_variations', 'query_variations');
      const val = fieldMatch[2].trim();
      if (currentField === 'keywords' || currentField === 'entities') {
        fields[currentField] = val ? val.split(',').map(v => v.trim()) : [];
      } else if (currentField === 'query_variations') {
        fields.query_variations = val ? [val] : [];
      } else {
        fields[currentField] = val;
      }
    } else if (currentField && line.trim()) {
      const trimmed = line.replace(/^\s*-\s*/, '').trim();
      if (!trimmed) continue;
      if (currentField === 'keywords') {
        fields.keywords.push(...trimmed.split(',').map(v => v.trim()));
      } else if (currentField === 'entities') {
        fields.entities.push(...trimmed.split(',').map(v => v.trim()));
      } else if (currentField === 'query_variations') {
        fields.query_variations.push(trimmed);
      } else {
        fields[currentField] = (fields[currentField] + ' ' + trimmed).trim();
      }
    }
  }
  
  return fields;
}

async function run() {
  console.log("🚀 FINAL INGESTION v6: Using knowledge_structured.txt as primary source...");
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log(`🧹 Wiping ${config.mongodb.vectorCollection}...`);
  await col.deleteMany({});
  
  // ─── PHASE 1: VERIFIED TRANSPORT + TRUST DATA ──────────────────────────────
  console.log("\n📌 Phase 1: Ingesting verified transport + trust data...");
  for (const item of verifiedTransport) {
    console.log(` - ${item.document_id}`);
    const embedding = await generateEmbedding(item.content);
    if (!embedding) { console.warn(`  ⚠️ No embedding for ${item.document_id}`); continue; }
    await col.insertOne({
      document_id: item.document_id,
      title: item.title,
      category: item.category,
      source: 'verified_data',
      content: item.content,
      text: item.content,
      keywords: item.keywords,
      entities: item.entities,
      query_variations: item.query_variations,
      embedding,
      timestamp: new Date().toISOString()
    });
  }
  console.log(`  ✅ ${verifiedTransport.length} verified docs indexed.`);

  // ─── PHASE 2: knowledge_structured.txt (133 pre-structured docs) ────────────
  if (fs.existsSync(STRUCTURED_FILE)) {
    console.log("\n📚 Phase 2: Ingesting knowledge_structured.txt...");
    const raw = fs.readFileSync(STRUCTURED_FILE, 'utf-8');
    const blocks = raw.split(/--- DOCUMENT_ID: [^\n]+ ---/).filter(b => b.trim().length > 50);
    
    let count = 0;
    for (const block of blocks) {
      const fields = parseDocBlock(block);
      if (!fields.content || fields.content.length < 30) continue;
      
      // Skip if only bus route data (already covered by verified data)
      if (fields.category === 'transport' && /AR-[0-9]|R-22/.test(fields.content)) continue;

      const embedding = await generateEmbedding(fields.content);
      if (!embedding) continue;
      
      await col.insertOne({
        document_id: `structured_${count}`,
        title: fields.title || 'MSAJCE Knowledge',
        category: fields.category || 'general',
        source: fields.source || 'knowledge_structured',
        content: fields.content,
        text: fields.content,
        summary: fields.summary,
        keywords: fields.keywords,
        entities: fields.entities,
        query_variations: fields.query_variations,
        embedding,
        timestamp: new Date().toISOString()
      });
      count++;
      process.stdout.write(`\r  Indexed ${count}/${blocks.length} docs...`);
    }
    console.log(`\n  ✅ ${count} structured docs indexed.`);
  }

  // ─── PHASE 3: knowledge_raw.txt (fallback for non-duplicate content) ────────
  if (fs.existsSync(RAW_FILE)) {
    console.log("\n📄 Phase 3: Ingesting knowledge_raw.txt (fallback)...");
    const raw = fs.readFileSync(RAW_FILE, 'utf-8');
    const sections = raw.split('--- SOURCE: ').filter(s => s.trim().length > 100);
    let count = 0;
    for (let i = 0; i < sections.length; i++) {
      const lines = sections[i].split('\n');
      const source = lines[0].replace(' ---', '').trim();
      let body = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
      body = body.replace(/lorem ipsum dolor sit amet[\s\S]*?copyright.*?mascot/ig, '').trim();
      if (body.length < 100) continue;

      // Chunk at sentence boundaries, 300 chars each
      const sentences = body.match(/[^.!?]+[.!?]+/g) || [body];
      let chunk = '';
      let ci = 0;
      for (const s of sentences) {
        if (chunk.length + s.length < 350) { chunk += ' ' + s; }
        else {
          if (chunk.trim().length > 60) {
            const emb = await generateEmbedding(chunk.trim());
            if (emb) {
              await col.insertOne({
                document_id: `raw_${i}_${ci}`,
                title: `MSAJCE: ${source.split('/').pop().replace('.php','')}`,
                category: source.includes('hostel') ? 'hostel' : 'general',
                source,
                content: chunk.trim(),
                text: chunk.trim(),
                embedding: emb,
                timestamp: new Date().toISOString()
              });
              count++; ci++;
            }
          }
          chunk = s;
        }
      }
    }
    console.log(`  ✅ ${count} raw fallback docs indexed.`);
  }

  const total = await col.countDocuments();
  console.log(`\n✅ FINAL INGESTION COMPLETE. Total in DB: ${total}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
