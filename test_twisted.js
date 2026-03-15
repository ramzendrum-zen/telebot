import { performHybridSearch } from './services/retrievalService.js';
import { getAIReponse } from './services/aiService.js';
import { buildPrompt } from './utils/promptBuilder.js';
import connectDB from './database/mongo.js';

async function test() {
  await connectDB();
  
  const twistedQueries = [
    "who is driving the MMDA bus at 6:15",
    "give me full details of route AR-8 including stops",
    "contact number for bus AR-5",
    "how to reach college from Manjambakkam"
  ];

  for (const q of twistedQueries) {
    console.log(`\nTesting Query: "${q}"`);
    const chunks = await performHybridSearch(q, 'transport');
    console.log(`Chunks found: ${chunks.length}`);
    
    const prompt = buildPrompt(q, chunks);
    const answer = await getAIReponse(prompt);
    console.log(`AI Answer:\n${answer}\n`);
    console.log("--------------------------------------------------");
  }
  
  process.exit(0);
}

test();
