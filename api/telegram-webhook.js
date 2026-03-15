import fetch from 'node-fetch';
import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from '../services/historyService.js';
import { detectIntent, normalizeQuery } from '../services/intentService.js';
import { pushLog } from '../services/monitorService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;
  const message = body?.message || body?.callback_query?.message;
  if (!message) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const rawText = (message.text || body?.callback_query?.data || '').trim();
  if (!rawText) return res.status(200).send('ok');

  try {
    await connectDB();

    // 1. Force Remove Legacy Keyboards / Handle Start
    if (rawText === '/start') {
      await sendTelegramMessage(chatId, "👋 Welcome to the *MSAJCE Academic Assistant*!\n\nI am here to help you with college information, bus routes, faculty details, and admissions. Just ask me your question!");
      return res.status(200).send('ok');
    }

    // ──────────────────────────────────────────────
    // 2. RAG Academic Assistant with Query Rewriting
    // ──────────────────────────────────────────────
    const normalizedQuery = normalizeQuery(rawText);
    const cacheKey = `v16:assistant:${normalizeText(normalizedQuery)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      await sendTelegramMessage(chatId, cached);
      return res.status(200).json({ status: 'cached' });
    }

    const memory = await getUserMemory(chatId);
    const intent = detectIntent(normalizedQuery);
    const enrichedQuery = rewriteQuery(normalizedQuery, memory);

    // Query Rewriting: expand for better retrieval
    const expandedQueries = await expandQuery(enrichedQuery);
    
    // Search with all expanded queries and merge
    const allChunks = new Map();
    for (const q of expandedQueries) {
      const chunks = await performHybridSearch(q, intent);
      chunks.forEach(c => {
        const id = c._id?.toString() || c.text?.slice(0, 30);
        if (!allChunks.has(id) || allChunks.get(id).score < c.score) {
          allChunks.set(id, c);
        }
      });
    }

    const topChunks = Array.from(allChunks.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    const finalPrompt = buildPrompt(enrichedQuery, topChunks, memory.last_entity);
    const aiReply = await getAIReponse(finalPrompt);

    await setCache(cacheKey, aiReply);
    await sendTelegramMessage(chatId, aiReply);

    if (intent !== 'general') await setUserMemory(chatId, normalizedQuery, intent);
    await pushLog('info', `Assistant Answer: "${aiReply.slice(0, 50)}..."`);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Assistant Webhook Error: ${error.message}`);
    await sendTelegramMessage(chatId, "I'm having trouble connecting right now. Please try again later.");
    return res.status(200).send('ok');
  }
}

/**
 * Query Rewriting Logic
 */
async function expandQuery(query) {
  const queries = [query];
  try {
    const prompt = `You are a query expansion system for a college AI assistant.
Convert this query into 2 clear alternative search queries for a vector database.
Query: "${query}"
Return ONLY 2 queries, one per line.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openRouter.models.cheap,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      const expanded = data.choices?.[0]?.message?.content || '';
      queries.push(...expanded.split('\n').map(l => l.trim()).filter(l => l.length > 5).slice(0, 2));
    }
  } catch (e) {
    logger.warn(`Expansion failed: ${e.message}`);
  }
  return [...new Set(queries)];
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
