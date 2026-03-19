import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/config.js';
import { generateEmbedding } from '../services/embeddingService.js';

dotenv.config();

const masterDrivers = [
  { route: 'AR-3', driver: 'Mr. Sathish K', phone: '+91-9789970304' },
  { route: 'AR-4', driver: 'Mr. M. Suresh', phone: '+91-9849265637' },
  { route: 'AR-5', driver: 'Mr. Velu / Mr. Murugan (Alt)', phone: '+91-9940050685 / +91-9962254425' },
  { route: 'AR-6', driver: 'Mr. Venkatachalam', phone: '+91-9025731746' },
  { route: 'AR-7', driver: 'Mr. Suresh', phone: '+91-9789895025' },
  { route: 'AR-8', driver: 'Mr. Raju', phone: '+91-9790750906' },
  { route: 'AR-9', driver: 'Mr. Kanagaraj', phone: '+91-9710209097' },
  { route: 'R-20', driver: 'Mr. M. Suresh', phone: '+91-9849265637' },
  { route: 'R-21', driver: 'Mr. E. Sathish', phone: '+91-9677007583' },
  { route: 'R-22', driver: 'Mr. Jaffar', phone: '+91-9566037890' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  console.log("Seeding Master Driver Chunks...");
  for (const item of masterDrivers) {
    const content = `MASTER DATA: The driver for MSAJCE Bus Route ${item.route} is ${item.driver}. Contact Number: ${item.phone}.`;
    const docId = `driver_${item.route.toLowerCase().replace('-', '')}`;
    
    // Check if exists
    const existing = await col.findOne({ document_id: docId });
    if (existing) {
        console.log(`Updating ${item.route}...`);
        await col.updateOne({ document_id: docId }, { $set: { content, text: content } });
    } else {
        console.log(`Inserting ${item.route}...`);
        const embedding = await generateEmbedding(content);
        await col.insertOne({
            document_id: docId,
            source: "verified_data",
            category: "transport",
            title: `Master Driver Record: ${item.route}`,
            content,
            text: content,
            embedding,
            metadata: { route: item.route, type: "master_driver", driver: item.driver, phone: item.phone }
        });
    }
  }

  process.exit(0);
}

run();
