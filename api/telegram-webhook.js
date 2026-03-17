import fetch from 'node-fetch';
import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory } from '../services/historyService.js';
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

    // ──────────────────────────────────────────────
    // NEW PRODUCTION RAG PIPELINE
    // ──────────────────────────────────────────────
    
    // 1. Normalize Query
    const { normalizedText, cacheKey } = normalizeQueryBasic(rawText);
    const redisKey = `v17:assistant:${cacheKey}`;

    // 2. Check Strict Redis Cache (<100ms)
    const cached = await getCache(redisKey);
    if (cached) {
      await sendTelegramMessage(chatId, cached);
      const latency = Date.now() - startTime;
      await pushLog('assistant', 'info', `Redis Hit: "${cached.slice(0, 40)}..."`, { latency });
      await updateMetrics('assistant', latency, true);
      return res.status(200).json({ status: 'cached_redis' });
    }

    // 3. Generate Embedding & Check Semantic FAQ Cache (Similarity > 0.9)
    const queryEmbedding = await generateEmbedding(normalizedText);
    const faqAnswer = await checkSemanticCache(queryEmbedding);
    if (faqAnswer) {
      await sendTelegramMessage(chatId, faqAnswer);
      const latency = Date.now() - startTime;
      await pushLog('assistant', 'info', `FAQ Semantic Hit: "${faqAnswer.slice(0, 40)}..."`, { latency });
      await updateMetrics('assistant', latency, true);
      return res.status(200).json({ status: 'cached_semantic' });
    }

    // 4. Query Context & Decomposition
    const memory = await getUserMemory(chatId);
    let contextualQuery = normalizedText;
    if (memory && memory.last_entity && normalizedText.split(' ').length <= 4) {
        contextualQuery = `${memory.last_entity} ${normalizedText}`;
    }

    const subQueries = await decomposeAndSelfQuery(contextualQuery);

    // 5. Hybrid Retrieval (Top 20 per sub-query, merged)
    const allChunks = new Map();
    for (const sq of subQueries) {
      const chunks = await performHybridSearch(sq.query, sq.category);
      chunks.forEach(c => {
        const id = c._id?.toString() || c.text?.slice(0, 30);
        if (!allChunks.has(id) || allChunks.get(id).score < c.score) {
          allChunks.set(id, c);
        }
      });
    }

    const mergedTop20 = Array.from(allChunks.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);

    // 6. Cross-Encoder Reranking (Top 5)
    const top5Chunks = await rerankChunks(contextualQuery, mergedTop20);

    if (top5Chunks.length === 0) {
        const noInfo = "I currently do not have that information in the MSAJCE knowledge base.";
        await sendTelegramMessage(chatId, noInfo);
        return res.status(200).send('ok');
    }

    // 7. Generate LLM Answer
    const finalPrompt = buildPrompt(contextualQuery, top5Chunks, memory.last_entity);
    const aiReply = await getAIReponse(finalPrompt);

    // 8. Output, Cache, & Learn
    await sendTelegramMessage(chatId, aiReply);
    await setCache(redisKey, aiReply); // 24h Redis cache
    
    // Store in continuous learning FAQ Semantic DB
    storeInSemanticCache(normalizedText, queryEmbedding, aiReply).catch(()=>null);

    await setUserMemory(chatId, contextualQuery, subQueries[0]?.category || 'general');
    
    const latency = Date.now() - startTime;
    await pushLog('assistant', 'info', `RAG Generated: "${aiReply.slice(0, 40)}..."`, { latency, chunks: top5Chunks.length });
    await updateMetrics('assistant', latency, true);

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
