import mongoose from 'mongoose';
import { performHybridSearch } from './services/retrievalService.js';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  console.log("DB connected");
  const res = await performHybridSearch('who is the driver for ar8', 'transport');
  console.log(JSON.stringify(res.map(c => ({ title: c.title, text: c.text, score: c.score })), null, 2));
  process.exit(0);
})();
