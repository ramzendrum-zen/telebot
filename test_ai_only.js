import { getAIReponse } from './services/aiService.js';
import dotenv from 'dotenv';
dotenv.config();

async function testAI() {
  try {
    console.log("Testing NVIDIA AI Chat API...");
    const resp = await getAIReponse("Tell me a fact about MSAJCE college.");
    console.log("Response:", resp.content);
    console.log("Usage:", JSON.stringify(resp.usage));
  } catch (e) {
    console.error("AI API ERROR:", e.message);
  }
}

testAI();
