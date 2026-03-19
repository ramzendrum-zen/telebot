import mongoose from 'mongoose';
import { performHybridSearch } from './services/retrievalService.js';
import { rerankChunks } from './services/rerankService.js';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
    const query = "who is the driver for ar8";
    
    console.log(`--- Testing Search: "${query}" ---`);
    const initial = await performHybridSearch(query, 'transport');
    console.log(`Phase 1: Initial ${initial.length} chunks. Top score: ${initial[0]?.score}`);
    initial.slice(0,3).forEach(c => console.log(`  - [${c.score}] ${c.title}: ${c.text?.slice(0,50)}...`));

    console.log("\n--- Testing Reranking ---");
    const top5 = await rerankChunks(query, initial);
    console.log(`Phase 2: Reranked top 5. Top Rerank Score: ${top5[0]?.rerankScore}`);
    top5.forEach(c => console.log(`  - [${c.rerankScore}] ${c.title}: ${c.text?.slice(0,100)}...`));
    
    process.exit(0);
})();
