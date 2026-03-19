import connectDB from '../database/mongo.js';
import mongoose from 'mongoose';
import { Redis } from '@upstash/redis';
import config from '../config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

export default async function handler(req, res) {
  if (req.method !== 'POST' || req.body.pass !== 'admin123') {
    return res.status(403).json({ error: 'Auth failed' });
  }

  try {
    await connectDB();
    const faqCol = mongoose.connection.db.collection('faqs');
    const dbRes = await faqCol.deleteMany({});
    
    await redis.flushall();

    res.json({ success: true, mongo: dbRes.deletedCount, redis: 'flushed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
