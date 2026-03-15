import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from '../services/historyService.js';
import { detectIntent, normalizeQuery } from '../services/intentService.js';
import { pushLog, updateMetrics } from '../services/monitorService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  // 1. Validate Input
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message;
  
  if (!message || !message.text) {
    return res.status(200).send('ok');
  }

  const chatId = message.chat.id;
  const rawText = message.text;
  
  // STEP 1: Normalize Query
  const normalizedQuery = normalizeQuery(rawText);
  const cleanKey = `v14:query:${normalizeText(normalizedQuery)}`;

  await pushLog('info', `Incoming Request: "${rawText}" (User: ${chatId})`);

  try {
    // 2. Database Connection
    await connectDB();

    // 3. Cache Check
    const cachedResponse = await getCache(cleanKey);
    if (cachedResponse) {
      logger.info(`Cache Hit: ${cleanKey}`);
      await pushLog('info', 'Cache hit. Delivering stored response.');
      await sendTelegramMessage(chatId, cachedResponse);
      return res.status(200).json({ status: 'cached' });
    }

    // STEP 2: Conversation Memory
    const memory = await getUserMemory(chatId);
    
    // STEP 3: Intent Detection
    const intent = detectIntent(normalizedQuery);
    await pushLog('intent', `Detected Intent: ${intent.toUpperCase()}`);
    
    // STEP 4: Query Rewriting (Expansion)
    const enrichedQuery = rewriteQuery(normalizedQuery, memory);
    if (enrichedQuery !== normalizedQuery) {
        await pushLog('rag_step', `Query Rewritten: "${enrichedQuery}"`);
    }
    
    const startRAG = Date.now();
    await pushLog('rag_step', 'Searching Vector DB + Metadata Index...');
    
    // STEP 5: Retrieval
    const contextResults = await performHybridSearch(enrichedQuery, intent);
    await pushLog('rag_step', `Retrieval done. Found ${contextResults.length} chunks.`);
    
    // STEP 6: Prompt Construction
    const finalPrompt = buildPrompt(enrichedQuery, contextResults, memory.last_entity);
    await pushLog('rag_step', 'Constructing final prompt for LLM...');
    
    // STEP 7: AI Generation
    const aiReply = await getAIReponse(finalPrompt);
    const duration = Date.now() - startRAG;
    
    await pushLog('info', `AI ANSWER: "${aiReply.substring(0, 150)}${aiReply.length > 150 ? '...' : ''}"`);
    await pushLog('info', `Pipeline Time: ${duration}ms`);
    await updateMetrics(duration, true);

    // STEP 9: Save Memory Context (Only for specific intents)
    if (intent !== 'general') {
      await setUserMemory(chatId, normalizedQuery, intent);
    }

    // STEP 10: Cache result & Send back
    await setCache(cleanKey, aiReply);
    await sendTelegramMessage(chatId, aiReply);

    return res.status(200).json({ status: 'success', duration });
  } catch (error) {
    logger.error(`Info Webhook Error: ${error.message}`);
    await pushLog('error', `FATAL ERROR: ${error.message}`, { stack: error.stack });
    await sendTelegramMessage(chatId, "I'm experiencing a temporary delay, but I'm still here to help! Please try re-asking your question in a moment.");
    return res.status(200).json({ status: 'error_handled' });
  }
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    logger.error(`Info Bot failed to send message: ${error.message}`);
  }
}
