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
      "Bus route AR-3 path: T. Nagar (06:20 AM) → Saidapet → Guindy → Velachery → Medavakkam → Camp Road → Mambakkam → College.",
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
      "Bus route AR-5 route details: MMDA School (6:15 AM) → Skywalk → Saidapet → Velachery → OMR → Ladies Hostel → College.",
      "AR-5 bus route includes stops at Anna Nagar, Skywalk, Saidapet, Velachery, OMR, and Ladies Hostel."
    ]
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star)", "Nerkundrum", "Maduravoyal", "Porur", "Perungalathur", "College"],
    statements: [
      "The driver for bus route AR-8 is Mr. Raju (+91-9790750906).",
      "Bus route AR-8 FULL ROUTE with Timings: Manjambakkam (7:10 AM) → Retteri → Senthil Nagar → Anna Nagar (Blue Star 7:25) → Nerkundrum → Maduravoyal → Porur (7:45) → Perungalathur → College.",
      "The AR-8 bus route includes stops at Manjambakkam, Retteri, Senthil Nagar, Anna Nagar, Nerkundrum, Maduravoyal, Porur, and Perungalathur."
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
        embedding,
        metadata: { 
            route: item.route, 
            driver: item.driver, 
            phone: item.phone,
            keywords: [item.route, "bus", "transport", "driver", "route", "full", ...item.stops],
            created_at: new Date().toISOString() 
        }
      });
    }
  }
}

async function ingestTrust(col) {
  const trustInfo = [
    {
      title: "Mohamed Sathak Trust Overview",
      content: "The Mohamed Sathak Trust was established in 1973 by the philanthropic Mohamed Sathak Family of Kilakarai, Ramanathapuram District, Tamil Nadu. It aims to provide quality education to rural and financially disadvantaged students.",
      keywords: ["trust", "mohamed sathak", "founder", "ramanathapuram", "kilakarai", "ram", "about trust"]
    },
    {
      title: "Trust Leadership",
      content: "The Mohamed Sathak Trust is led by Mr. Mohamed Yousuf S.M. (Chairman), Janaba. S.M.H. Sharmila (Secretary), and Janab. P.R.L. Hamid Ibrahim (Executive Director).",
      keywords: ["chairman", "secretary", "yousuf", "sharmila", "hamid", "leadership", "trustee"]
    }
  ];

  for (const item of trustInfo) {
    const embedding = await generateEmbedding(item.content);
    await col.insertOne({
      document_id: new mongoose.Types.ObjectId().toString(),
      source: "verified_trust",
      category: "general",
      title: item.title,
      content: item.content,
      text: item.content,
      embedding,
      metadata: { 
          name: item.title,
          keywords: item.keywords,
          created_at: new Date().toISOString() 
      }
    });
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
  
  console.log("Wiping collection for clean ingestion...");
  await col.deleteMany({});
  
  // Scraped Data
  if (fs.existsSync('scraped_data.json')) {
    const scraped = JSON.parse(fs.readFileSync('scraped_data.json'));
    for (const page of scraped) {
      console.log(`Processing scraped: ${page.url}`);
      const chunks = await cleanAndStructureData(page.content);
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content);
        await col.insertOne({
           ...chunk, 
           text: chunk.content, 
           embedding, 
           source: "scraped",
           metadata: { 
               created_at: new Date().toISOString(), 
               url: page.url,
               keywords: chunk.keywords || [] 
           }
        });
      }
    }
  }

  // Detailed Data
  await ingestDetailed(col);
  
  // Trust Data
  await ingestTrust(col);

  console.log("Unified Ingestion Done.");
  process.exit(0);
}

run();
