import { getAIReponse } from './services/aiService.js';
import { rerankChunks } from './services/rerankService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log("Testing NVIDIA Chat API...");
  try {
    const r1 = await getAIReponse("Hello, how are you?");
    console.log("AI Response OK:", r1.content.slice(0, 50));
  } catch (e) {
    console.error("AI API ERROR:", e.message);
  }

  console.log("\nTesting NVIDIA Reranker...");
  try {
    const r2 = await rerankChunks("test", [{ content: "test 1", score:1 }, { content: "test 2", score:2 }], 1);
    console.log("Reranker OK. Top:", r2[0].content);
  } catch (e) {
    console.error("Reranker ERROR:", e.message);
  }

  process.exit(0);
}

test();
