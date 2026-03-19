import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateEmbedding } from '../services/embeddingService.js';

export default async function handler(req, res) {
  try {
    await mongoose.connect(config.mongodb.uri, { dbName: config.mongodb.dbName });
    const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);
    
    const coreFacts = [
        "Mohamed Sathak A J College of Engineering (MSAJCE) is a sprawling green campus over 70 acres located inside the SIPCOT IT Park, Siruseri, surrounded by 100+ multinational IT companies such as TCS, CTS, Intellect, Aspire, Steria, Polaris, FSS, etc.",
        "The college was established in 2001 and is approved by AICTE New Delhi and affiliated to Anna University, Chennai.",
        "MSAJCE provides bus facility (22+ buses) covering various routes in Chennai, Chengalpattu, Kanchipuram and Thiruvallur districts.",
        "The campus is well-equipped with state-of-the-art facilities, labs, libraries, hostels (Boys inside campus, Girls in Sholinganallur), and a well-equipped gym (fitness center)."
    ];

    let counts = 0;
    for (const fact of coreFacts) {
        const embedding = await generateEmbedding(fact);
        await col.insertOne({
            text: fact,
            content: fact,
            embedding,
            title: "MSAJCE Core Facts",
            source: "admin_bootstrap",
            timestamp: new Date().toISOString()
        });
        counts++;
    }

    res.json({ success: true, added: counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
