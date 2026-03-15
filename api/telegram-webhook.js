const connectDB = require('../database/mongo');
const { getCache, setCache } = require('../services/cacheService');
const { performHybridSearch } = require('../services/retrievalService');
const { getAIReponse } = require('../services/aiService');
const { normalizeText, buildPrompt } = require('../utils/promptBuilder');
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config/config');

module.exports = async (req, res) => {
  // 1. Validate Input
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { message } = req.body;
  if (!message || !message.text) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const rawText = message.text;
  const cleanKey = `query:${normalizeText(rawText)}`;

  try {
    // 2. Database Connection (Warm-up)
    await connectDB();

    // 3. Cache Check
    const cachedResponse = await getCache(cleanKey);
    if (cachedResponse) {
      logger.info(`Cache Hit: ${cleanKey}`);
      await sendTelegramMessage(chatId, cachedResponse);
      return res.status(200).json({ status: 'cached' });
    }

    // 4. RAG Pipeline
    logger.info(`Starting RAG for: ${rawText}`);
    
    // Perform Hybrid Search
    const contextResults = await performHybridSearch(rawText);
    
    // Build Prompt
    const finalPrompt = buildPrompt(rawText, contextResults);
    
    // Get AI Response
    const aiReply = await getAIReponse(finalPrompt);

    // 5. Cache & Return
    await setCache(cleanKey, aiReply);
    await sendTelegramMessage(chatId, aiReply);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Webhook Error: ${error.message}`);
    await sendTelegramMessage(chatId, "Sorry, I couldn't retrieve the information right now. Please try again later.");
    return res.status(500).json({ status: 'error' });
  }
};

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  return axios.post(url, {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });
}
