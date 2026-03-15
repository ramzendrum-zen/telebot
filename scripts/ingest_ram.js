import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { generateEmbedding } from '../services/embeddingService.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

async function ingestRamProfile() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const col = db.collection(config.mongodb.vectorCollection);

    const ramData = [
      {
        content: "Mr. Ramanathan S, also known as Ram, is the creator of this AI assistant. He is a 2nd year B.Tech student studying Information Technology at Mohamed Sathak A.J. College of Engineering (MSAJCE), Batch 2024–2028.",
        metadata: {
          category: "creator",
          tags: ["Ram", "Ramanathan", "creator", "developer"],
          summary: "Information about the creator of the chatbot, Ramanathan S (Ram)."
        }
      },
      {
        content: "Ramanathan S (Ram) is skilled in Web Development, Frontend Development, Java, React, and Automation Tools like n8n and Automation Anywhere. He has worked on projects such as Event Booking Management, SmartHostel Web App, this AI Chatbot, and a Unity Game named Haunted Village.",
        metadata: {
          category: "creator_details",
          tags: ["skills", "projects", "experience"],
          summary: "Technical skills and projects of Ramanathan S (Ram)."
        }
      }
    ];

    for (const item of ramData) {
      logger.info(`Ingesting Ram profile item...`);
      const embedding = await generateEmbedding(item.content);
      
      await col.insertOne({
        text: item.content,
        embedding: embedding,
        metadata: {
          ...item.metadata,
          source: 'manual_ingestion',
          last_updated: new Date()
        }
      });
    }

    logger.info("Ram profile ingestion complete!");
  } catch (e) {
    logger.error(`Ingestion Error: ${e.message}`);
  } finally {
    await client.close();
  }
}

ingestRamProfile();
