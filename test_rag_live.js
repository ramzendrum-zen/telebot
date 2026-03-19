import connectDB from './database/mongo.js';
import { performHybridSearch } from './services/retrievalService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await connectDB();
  const query = "How many acres the campus is";
  console.log(`\n🔍 TESTING QUERY: "${query}"`);
  
  const results = await performHybridSearch(query);
  console.log(`\n📊 RETRIEVAL RESULTS: ${results.length} chunks found.`);
  results.forEach((r, i) => {
    console.log(`[${i+1}] Score: ${r.score.toFixed(2)} | Text: ${r.text.slice(0, 100)}...`);
  });
  
  process.exit(0);
}

test().catch(console.error);
