import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  // 1. Validate Input (Telegram only sends POST)
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message;
  
  if (!message || !message.text) {
    return res.status(200).send('ok');
  }

  const chatId = message.chat.id;
  const rawText = message.text;
  const cleanKey = `query:${normalizeText(rawText)}`;

  try {
    // 2. Database Connection (Standard for serverless)
    await connectDB();

    // 3. Cache Check (Upstash Redis)
    const cachedResponse = await getCache(cleanKey);
    if (cachedResponse) {
      logger.info(`Cache Hit: ${cleanKey}`);
      await sendTelegramMessage(chatId, cachedResponse);
      return res.status(200).json({ status: 'cached' });
    }

    // 4. RAG Pipeline
    logger.info(`Processing RAG for: ${rawText}`);
    
    // Retrieve context from MongoDB (Hybrid Search)
    const contextResults = await performHybridSearch(rawText);
    
    // Generate AI response
    const finalPrompt = buildPrompt(rawText, contextResults);
    const aiReply = await getAIReponse(finalPrompt);

    // 5. Cache result & Send back to Telegram
    await setCache(cleanKey, aiReply);
    await sendTelegramMessage(chatId, aiReply);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Webhook Runtime Error: ${error.message}`);
    // Optional fallback message to user
    await sendTelegramMessage(chatId, "I'm experiencing a temporary delay, but I'm still here to help! Please try re-asking your question in a moment.");
    return res.status(200).json({ status: 'error_handled' });
  }
}

/**
 * Sends a message back to the Telegram user using native fetch.
 */
async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      const err = await response.text();
      logger.error(`Telegram API Error: ${err}`);
    }
  } catch (error) {
    logger.error(`Failed to send Telegram message: ${error.message}`);
  }
}
