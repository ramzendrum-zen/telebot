import { performHybridSearch, directEntityLookup } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from './historyService.js';
import { normalizeQueryBasic } from './normalizationService.js';
import { checkSemanticCache, storeInSemanticCache } from './faqLearningService.js';
import { decomposeAndSelfQuery } from './selfQueryService.js';
import { generateEmbedding } from './embeddingService.js';
import { getCache, setCache } from './cacheService.js';
import { pushLog } from './monitorService.js';
import logger from '../utils/logger.js';

// ─── STEP 5: DIRECT ENTITY LOOKUP KEYWORDS ────────────────────────────────────
const ENTITY_LOOKUP_MAP = {
  principal:      'admin_principal',
  'college head': 'admin_principal',
  warden:         'admin_principal',
  contact:        'admin_contact',
  'phone number': 'admin_contact',
  address:        'admin_contact',
  'campus size':  'admin_campus_facts',
  location:       'admin_campus_facts',
  acres:          'admin_campus_facts',
  established:    'admin_campus_facts',
  'sathak trust': 'trust_institutions_list',
  '18 colleges':  'trust_institutions_list',
  institutions:   'trust_institutions_list',
};

function detectEntityLookup(query) {
  const q = query.toLowerCase();
  for (const [keyword, docId] of Object.entries(ENTITY_LOOKUP_MAP)) {
    if (q.includes(keyword)) return docId;
  }
  return null;
}

// ─── STEP 11: RESPONSE VALIDATION ────────────────────────────────────────────
function detectContextIgnored(reply, chunks) {
  const lowerReply = reply.toLowerCase();
  const fallbackPhrases = [
    'i do not have', 'i currently do not', 'not in my knowledge',
    'no information', 'context does not mention', 'provided context does not'
  ];
  const hasFallback = fallbackPhrases.some(p => lowerReply.includes(p));

  // If it said no data but we had chunks with good scores
  const hadGoodData = chunks.some(c => (c.score || 0) > 8);
  return hasFallback && hadGoodData;
}

/**
 * PRODUCTION-GRADE RAG PIPELINE (14-Step Implementation)
 */
export async function processRAGQuery(chatId, rawText) {
  const startTime = Date.now();
  const logs = [];
  const log = (step, msg, data = '') => {
    const entry = `[${step}] ${msg}${data ? ` | ${JSON.stringify(data)}` : ''}`;
    logs.push(entry);
    logger.info(entry);
  };

  // ─── STEP 6: NORMALIZE QUERY ─────────────────────────────────────────────
  const { normalizedText, cacheKey } = normalizeQueryBasic(rawText);
  const redisKey = `v20:rag:${cacheKey}`;
  log('STEP-6', `Normalized: "${normalizedText}" | CacheKey: ${cacheKey}`);

  // ─── STEP 5: DIRECT ENTITY LOOKUP (before cache — always fresh) ──────────
  const entityDocId = detectEntityLookup(normalizedText);
  if (entityDocId) {
    log('STEP-5', `Direct entity lookup triggered for docId: ${entityDocId}`);
    const entityChunks = await directEntityLookup(entityDocId);
    if (entityChunks.length > 0) {
      const memory = await getUserMemory(chatId);
      const finalPrompt = buildPrompt(normalizedText, entityChunks, memory.last_entity);
      const aiReply = await getAIReponse(finalPrompt);
      await setUserMemory(chatId, normalizedText, 'admin', rawText).catch(() => null);
      await setCache(redisKey, aiReply);
      log('STEP-5', `Answered via direct entity lookup. Latency: ${Date.now() - startTime}ms`);
      return { aiReply, source: 'direct_entity', latency: Date.now() - startTime };
    }
  }

  // ─── CACHE CHECK ─────────────────────────────────────────────────────────
  const cached = await getCache(redisKey);
  if (cached) {
    log('CACHE', 'Redis cache HIT');
    return { aiReply: cached, source: 'redis', latency: Date.now() - startTime };
  }

  // ─── SEMANTIC FAQ CACHE ───────────────────────────────────────────────────
  const queryEmbedding = await generateEmbedding(normalizedText, 'query');
  const faqAnswer = await checkSemanticCache(queryEmbedding);
  if (faqAnswer) {
    log('CACHE', 'Semantic FAQ cache HIT');
    return { aiReply: faqAnswer, source: 'semantic_cache', latency: Date.now() - startTime };
  }

  // ─── STEP 7: QUERY DECOMPOSITION + CONTEXT REWRITE ───────────────────────
  const memory = await getUserMemory(chatId);
  const contextualQuery = rewriteQuery(normalizedText, memory);
  log('STEP-7', `Context rewrite: "${contextualQuery}"`);
  const subQueries = await decomposeAndSelfQuery(contextualQuery);
  log('STEP-7', `Decomposed into ${subQueries.length} sub-queries`);

  // ─── STEP 4: HYBRID RETRIEVAL ─────────────────────────────────────────────
  const allChunks = new Map();
  for (const sq of subQueries) {
    const chunks = await performHybridSearch(sq.query, sq.category, sq.filters);
    chunks.forEach(c => {
      const id = c._id?.toString() || c.content?.slice(0, 30);
      if (!allChunks.has(id) || allChunks.get(id).score < c.score) {
        allChunks.set(id, c);
      }
    });
  }

  let top5Chunks = Array.from(allChunks.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);
  log('STEP-4', `Hybrid search returned ${allChunks.size} chunks. Top score: ${top5Chunks[0]?.score || 0}`, 
      top5Chunks.slice(0,3).map(c => ({ title: c.title, score: c.score })));

  // ─── STEP 9: CONFIDENCE SCORING — retry if too weak ──────────────────────
  const topScore = top5Chunks[0]?.score || 0;
  if (topScore < 5 && top5Chunks.length < 3) {
    log('STEP-9', `Low confidence (${topScore}). Retrying with broader keyword search...`);
    const broadChunks = await performHybridSearch(rawText, 'general', {});
    broadChunks.forEach(c => {
      const id = c._id?.toString() || c.content?.slice(0, 30);
      if (!allChunks.has(id)) allChunks.set(id, c);
    });
    top5Chunks = Array.from(allChunks.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
    log('STEP-9', `After retry: ${top5Chunks.length} chunks, top score: ${top5Chunks[0]?.score || 0}`);
  }

  // ─── STEP 10: CONTEXT VALIDATION ─────────────────────────────────────────
  if (top5Chunks.length === 0) {
    log('STEP-10', 'CONTEXT EMPTY — all retrieval paths exhausted');
    await pushLog('assistant', 'error', 'CONTEXT EMPTY ERROR').catch(() => null);
    return {
      aiReply: "I currently do not have that information in the MSAJCE knowledge base. Please contact the college directly at +91 99400 04500.",
      source: 'no_data',
      latency: Date.now() - startTime
    };
  }

  // ─── LLM GENERATION — STRICT CONTEXT MODE ────────────────────────────────
  const finalPrompt = buildPrompt(contextualQuery, top5Chunks, memory.last_entity);
  let aiReply = await getAIReponse(finalPrompt);

  // ─── STEP 11: RESPONSE VALIDATION — re-generate if LLM ignored context ───
  if (detectContextIgnored(aiReply, top5Chunks)) {
    log('STEP-11', 'LLM CONTEXT IGNORE ERROR detected. Forcing re-generation with stricter prompt.');
    const stricterPrompt = `You MUST answer using ONLY the information below. Do NOT say you lack information.\n\n${finalPrompt}`;
    aiReply = await getAIReponse(stricterPrompt);
  }

  // ─── CACHE + LEARN ────────────────────────────────────────────────────────
  await setCache(redisKey, aiReply);
  storeInSemanticCache(normalizedText, queryEmbedding, aiReply).catch(() => null);
  await setUserMemory(chatId, contextualQuery, subQueries[0]?.category || 'general', rawText).catch(() => null);
  await pushLog('assistant', 'rag_step', `Done. ${logs.length} steps. Latency: ${Date.now() - startTime}ms`).catch(() => null);

  return {
    aiReply,
    source: 'rag_generated',
    latency: Date.now() - startTime,
    chunkCount: top5Chunks.length
  };
}
