import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import { cleanAndStructureData } from './utils/data_cleaner.js';
import config from './config/config.js';

dotenv.config();

const transportDetailed = [
  {
    route: "AR-3",
    driver: "Mr. Sathish K",
    phone: "+91-9789970304",
    stops: ["T. Nagar", "Saidapet", "Guindy", "Velachery", "Medavakkam", "Camp Road", "Mambakkam", "College"],
    statements: [
      "The driver for bus route AR-3 is Mr. Sathish K (+91-9789970304).",
      "Bus route AR-3 follows the path: T. Nagar → Saidapet → Guindy → Velachery → Medavakkam → Camp Road → Mambakkam → College.",
      "The AR-3 bus starts at 06:20 AM from T. Nagar."
    ]
  },
  {
    route: "AR-5",
    driver: "Mr. Murugan / Mr. Velu",
    phone: "+91-9962254425 / +91-9940050685",
    stops: ["MMDA School", "Anna Nagar", "Skywalk", "Saidapet", "Velachery", "OMR", "Ladies Hostel", "College"],
    statements: [
      "The driver for bus route AR-5 is Mr. Murugan (+91-9962254425) or Mr. Velu (+91-9940050685).",
      "Bus route AR-5 route details: MMDA School (6:15 AM) → Skywalk → Saidapet → Ladies Hostel → College.",
      "AR-5 / N-3 bus route includes stops at Anna Nagar, Velachery, and OMR."
    ]
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star)", "Nerkundrum", "Maduravoyal", "Porur", "Perungalathur", "College"],
    statements: [
      "The driver for bus route AR-8 is Mr. Raju (+91-9790750906).",
      "Bus route AR-8 full route: Manjambakkam (7:10 AM) → Retteri → Anna Nagar (Blue Star 7:25) → Porur (7:45) → Perungalathur → College."
    ]
  }
];

async function ingestDetailed(col) {
  for (const item of transportDetailed) {
    for (const content of item.statements) {
      const embedding = await generateEmbedding(content);
      await col.insertOne({
        document_id: new mongoose.Types.ObjectId().toString(),
        source: "verified_transport",
        category: "transport",
        title: `Bus Route ${item.route}`,
        content, text: content,
        keywords: [item.route, "bus", "transport", "driver", "route", ...item.stops],
        query_variations: [`who is the driver for ${item.route}`, `timings for ${item.route}`],
        embedding,
        metadata: { route: item.route, driver: item.driver, phone: item.phone, created_at: new Date().toISOString() }
      });
    }
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  // Scraped Data
  if (fs.existsSync('scraped_data.json')) {
    const scraped = JSON.parse(fs.readFileSync('scraped_data.json'));
    for (const page of scraped) {
      console.log(`Processing scraped: ${page.url}`);
      const chunks = await cleanAndStructureData(page.content);
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content);
        await col.insertOne({
           ...chunk, text: chunk.content, embedding, source: "scraped",
           metadata: { created_at: new Date().toISOString(), url: page.url }
        });
      }
    }
  }

  // Detailed Data
  await ingestDetailed(col);

  console.log("Unified Ingestion Done.");
  process.exit(0);
}

run();
