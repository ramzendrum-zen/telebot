import { processRAGQuery } from './services/ragService.js';

async function testNonTransport() {
  const chatId = "test_user_unique_123";
  
  const testCases = [
    "What is the intake for B.E. Computer Science in 2025-26?",
    "Tell me about the Pragati scholarship.",
    "What are the library stack collection details?",
    "Who is the principal?",
    "What is his phone number?" // Follow-up test
  ];

  for (const q of testCases) {
    console.log(`\n\nUSER: ${q}`);
    const res = await processRAGQuery(chatId, q);
    console.log(`ASSISTANT: ${res.aiReply}`);
  }

  process.exit(0);
}

testNonTransport().catch(console.error);
