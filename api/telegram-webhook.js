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

import { handleGrievanceFlow, trackComplaint, MAIN_MENU } from '../services/complaintService.js';

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
    await pushLog('info', `Incoming: "${rawText}" (User: ${chatId})`);

    // ──────────────────────────────────────────────
    // 1. /start — always show main menu
    // ──────────────────────────────────────────────
    if (rawText === '/start' || rawText === '🏠 Back to Menu') {
      await sendReply(chatId, MAIN_MENU);
      return res.status(200).send('ok');
    }

    // ──────────────────────────────────────────────
    // 2. Complaint Tracking flow
    // ──────────────────────────────────────────────
    if (rawText === '🔍 Track Complaint') {
      await setCache(`track_state:${chatId}`, true);
      await sendReply(chatId, {
        text: "🔍 *Track Your Complaint*\n\nEnter your Complaint ID (e.g., *GRV-2043*):",
        keyboard: { keyboard: [['🏠 Back to Menu']], resize_keyboard: true }
      });
      return res.status(200).send('ok');
    }

    const isTracking = await getCache(`track_state:${chatId}`);
    if (isTracking) {
      await setCache(`track_state:${chatId}`, null);
      const result = await trackComplaint(rawText);
      await sendReply(chatId, result);
      return res.status(200).send('ok');
    }

    // ──────────────────────────────────────────────
    // 3. Grievance bot flow (registration, menu shortcuts, verification)
    // ──────────────────────────────────────────────
    const grievanceKeywords = ['Register Complaint', 'My Complaints', 'FAQ', 'Contact Administration', 'Emergency', '❌ Cancel', '⏭️ Skip', '📝', '📋', '💡', '📞', '🚨'];
    const isInGrievanceFlow = await getCache(`grv_state:${chatId}`) || await getCache(`verify_state:${chatId}`);
    const isGrievanceIntent = grievanceKeywords.some(k => rawText.includes(k));

    if (isInGrievanceFlow || isGrievanceIntent) {
      const result = await handleGrievanceFlow(chatId, rawText, message);
      await sendReply(chatId, result);
      return res.status(200).send('ok');
    }

    // ──────────────────────────────────────────────
    // 4. RAG Academic Assistant with Query Rewriting
    // ──────────────────────────────────────────────
    const normalizedQuery = normalizeQuery(rawText);
    const cacheKey = `v16:${normalizeText(normalizedQuery)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      await sendReply(chatId, { text: cached });
      return res.status(200).json({ status: 'cached' });
    }

    const memory = await getUserMemory(chatId);
    const intent = detectIntent(normalizedQuery);
    const enrichedQuery = rewriteQuery(normalizedQuery, memory);

    // Query Rewriting: expand the user's query for better retrieval
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
    await sendReply(chatId, { text: aiReply });

    if (intent !== 'general') await setUserMemory(chatId, normalizedQuery, intent);
    await pushLog('info', `AI ANSWER: "${aiReply.slice(0, 80)}..."`);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Webhook Error: ${error.message}`);
    await pushLog('error', `FATAL: ${error.message}`);
    await sendReply(chatId, { text: "I'm having trouble connecting right now. Please try again in a moment." });
    return res.status(200).send('ok');
  }
}

/**
 * Query Rewriting — expands a vague query into 3 better search queries
 * using a fast LLM call before vector retrieval.
 */
async function expandQuery(query) {
  // Always include the original query
  const queries = [query];

  try {
    const prompt = `You are a query expansion system for a college AI assistant (MSAJCE).
Convert the user query into 2 clear, specific search queries to find relevant information.
Focus on: roles (principal, HOD, dean), departments, bus routes, timings, fees, admissions.

User query: "${query}"

Return ONLY 2 alternative queries, one per line. No numbering, no explanation.`;

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
      const lines = expanded.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      queries.push(...lines.slice(0, 2));
    }
  } catch (e) {
    logger.warn(`Query expansion failed: ${e.message}`);
    // Fall through with just the original query
  }

  return [...new Set(queries)]; // deduplicate
}

/**
 * Unified reply sender — handles both string and {text, keyboard} responses
 */
async function sendReply(chatId, result) {
  const text = typeof result === 'string' ? result : result?.text;
  const keyboard = typeof result === 'object' ? result?.keyboard : null;

  if (!text) return;
  await sendTelegramMessage(chatId, text, keyboard);
}

async function sendTelegramMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (keyboard) payload.reply_markup = keyboard;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) return;

    // Fallback: retry without Markdown if 400
    if (response.status === 400) {
      await pushLog('warning', `Markdown failed for ${chatId}, retrying plain text.`);
      delete payload.parse_mode;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
    }
  } catch (error) {
    logger.error(`Bot send failed: ${error.message}`);
  }
}
