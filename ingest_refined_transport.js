import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateEmbedding } from './services/embeddingService.js';
import config from './config/config.js';

dotenv.config();

const refinedTransportData = [
  {
    route: "AR-3",
    driver: "Mr. Sathish K",
    phone: "+91-9789970304",
    stops: ["T. Nagar", "Saidapet", "Guindy", "Velachery", "Medavakkam", "Camp Road", "Mambakkam"],
    timings: "Starts at 06:20 AM from T. Nagar.",
    full_route: "T. Nagar → Saidapet → Guindy → Velachery → Medavakkam → Camp Road → Mambakkam → College"
  },
  {
    route: "AR-8",
    driver: "Mr. Raju",
    phone: "+91-9790750906",
    stops: ["Manjambakkam", "Retteri", "Senthil Nagar", "Anna Nagar (Blue Star)", "Nerkundrum", "Maduravoyal", "Porur", "Perungalathur"],
    timings: "Starts at 07:10 AM from Manjambakkam.",
    full_route: "Manjambakkam (7:10 AM) → Retteri → Senthil Nagar → Anna Nagar (Blue Star 7:25) → Nerkundrum → Maduravoyal → Porur (7:45) → Perungalathur → College"
  },
  {
    route: "AR-5",
    driver: "Mr. Murugan / Mr. Velu",
    phone: "+91-9962254425 / +91-9940050685",
    stops: ["Avadi", "Ambattur", "Padi", "Anna Nagar", "Velachery", "OMR", "MMDA School", "Skywalk", "Saidapet", "Ladies Hostel"],
    timings: "Starts at 06:15 AM from MMDA School.",
    full_route: "Avadi → Ambattur → Padi → Anna Nagar → Velachery → OMR → College | MMDA School (6:15 AM) → Skywalk → Saidapet → Ladies Hostel → College"
  },
  {
    route: "R-22",
    driver: "Mr. Panneerselvam / Mr. Jaffar",
    phone: "+91-9840428612 / +91-9566037890",
    stops: ["Velachery", "Medavakkam", "Perumbakkam", "Shollinganallur", "Poonamallee", "Porur", "Ramapuram"],
    timings: "Check local schedule. Generally starts around 06:05 AM.",
    full_route: "Velachery → Medavakkam → Perumbakkam → Shollinganallur → College | Poonamallee (6:05 AM) → Porur → Ramapuram → College"
  }
];

async function ingest() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Refining transport knowledge...");

  for (const item of refinedTransportData) {
    console.log(`Ingesting detailed context for ${item.route}`);
    
    // Create multiple semantic statements for each route to ensure "twisted" queries hit
    const statements = [
      `The driver for bus route ${item.route} is ${item.driver} and can be contacted at ${item.phone}.`,
      `Bus route ${item.route} follows this path: ${item.full_route}.`,
      `The ${item.route} bus route includes stops at ${item.stops.join(', ')}.`,
      `For students traveling from ${item.stops[0]}, the ${item.route} bus starts at ${item.timings}.`
    ];

    for (const content of statements) {
      const embedding = await generateEmbedding(content);
      await col.insertOne({
        document_id: new mongoose.Types.ObjectId().toString(),
        source: "verified_transport",
        category: "transport",
        title: `Bus Route ${item.route} Details`,
        content: content,
        text: content,
        keywords: [item.route, "bus", "transport", "driver", ...item.stops],
        query_variations: [
          `who is the driver for ${item.route}`,
          `what is the route for ${item.route}`,
          `bus timings for ${item.route}`,
          `how to reach college from ${item.stops[0]}`,
          `contact number for ${item.route} driver`
        ],
        embedding: embedding,
        metadata: {
          route: item.route,
          driver: item.driver,
          phone: item.phone,
          created_at: new Date().toISOString()
        }
      });
    }
  }

  console.log("Transport knowledge refinement complete!");
  process.exit(0);
}

ingest();
