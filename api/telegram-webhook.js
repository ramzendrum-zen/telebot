import fetch from 'node-fetch';
import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from '../services/historyService.js';
import { pushLog, updateMetrics } from '../services/monitorService.js';
import { normalizeQueryBasic } from '../services/normalizationService.js';
import { checkSemanticCache, storeInSemanticCache } from '../services/faqLearningService.js';
import { decomposeAndSelfQuery } from '../services/selfQueryService.js';
import { rerankChunks } from '../services/rerankService.js';
import { generateEmbedding } from '../services/embeddingService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;
  const message = body?.message || body?.callback_query?.message;
  if (!message) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const rawText = (message.text || body?.callback_query?.data || '').trim();
  const startTime = Date.now();
  if (!rawText) return res.status(200).send('ok');

  try {
    await connectDB();

    if (rawText === '/start') {
      await sendTelegramMessage(chatId, "👋 Welcome to the *MSAJCE Academic Assistant*!\n\nI am here to help you with college information, bus routes, faculty details, and admissions. Just ask me your question!");
      return res.status(200).send('ok');
    }

    // ─── SMART GREETING HANDLER ──────────────────────────────────────────────
    const greetings = /\b(hi|hello|hey|hlo|good morning|morning|namaste|evening|greetings)\b/i;
    if (greetings.test(rawText) && rawText.split(/\s+/).length <= 2) {
      const firstName = message.from?.first_name || 'there';
      const greetingResponse = `• Hello, ${firstName} 👋\n• How can I help you today?\n\n*Quick access topics:*\n• 🚌 Bus Routes\n• 🎓 Departments\n• 👨‍🏫 Faculty\n• 📞 Contact Details`;
      
      await sendTelegramMessage(chatId, greetingResponse);
      return res.status(200).send('ok');
    }

    // ──────────────────────────────────────────────
    // PRODUCTION RAG PIPELINE (Unified)
    // ──────────────────────────────────────────────
    const { processRAGQuery } = await import('../services/ragService.js');
    const ragResult = await processRAGQuery(chatId, rawText);

    await sendTelegramMessage(chatId, ragResult.aiReply);
    
    const latency = Date.now() - startTime;
    await pushLog('assistant', 'info', `RAG Query: ${rawText.slice(0, 80)}`, { 
        latency, 
        source: ragResult.source,
        chunks: ragResult.chunkCount 
    });
    await updateMetrics('assistant', latency, true);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Assistant Webhook Error: ${error.message}`);
    const latency = Date.now() - startTime;
    await pushLog('assistant', 'error', `Failure: ${error.message.slice(0, 50)}`, { latency });
    await updateMetrics('assistant', latency, false);
    
    await sendTelegramMessage(chatId, "I'm having trouble connecting right now. Please try again later.");
    return res.status(200).send('ok');
  }
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok && response.status === 400) {
      // Retry without markdown
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: text,
          reply_markup: { remove_keyboard: true }
        }),
        signal: AbortSignal.timeout(10000)
      });
    }
  } catch (error) {
    logger.error(`Assistant send failed: ${error.message}`);
  }
}
