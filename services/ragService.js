import { performHybridSearch, directEntityLookup } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from './historyService.js';
import { normalizeQueryBasic } from './normalizationService.js';
import { checkSemanticCache, storeInSemanticCache } from './faqLearningService.js';
import { decomposeAndSelfQuery } from './selfQueryService.js';
import { generateEmbedding } from './embeddingService.js';
import { rerankChunks } from './rerankService.js';
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
  const redisKey = `v36:rag:${cacheKey}`;
  log('STEP-6', `Normalized: "${normalizedText}" | CacheKey: ${cacheKey}`);
  const totalTokens = { prompt: 0, completion: 0, total: 0 };

  // ─── STEP 5: DIRECT ENTITY LOOKUP (before cache — always fresh) ──────────
  const entityDocId = detectEntityLookup(normalizedText);
  if (entityDocId) {
    log('STEP-5', `Direct entity lookup triggered for docId: ${entityDocId}`);
    const entityChunks = await directEntityLookup(entityDocId);
    if (entityChunks.length > 0) {
      const memory = await getUserMemory(chatId);
      const finalPrompt = buildPrompt(normalizedText, entityChunks);
      const { content: aiReply, usage } = await getAIReponse(finalPrompt);
      totalTokens.prompt += usage.prompt_tokens;
      totalTokens.completion += usage.completion_tokens;
      totalTokens.total += usage.total_tokens;
      log('TOKENS', `Direct | P: ${usage.prompt_tokens} | C: ${usage.completion_tokens} | T: ${usage.total_tokens}`);
      await setUserMemory(chatId, normalizedText, 'admin', rawText).catch(() => null);
      await setCache(redisKey, aiReply);
      await pushLog('assistant', 'info', `Direct: ${rawText.slice(0, 50)}`, { query: rawText, tokens: totalTokens });
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
  const { subject, subQueries } = await decomposeAndSelfQuery(contextualQuery);
  log('STEP-7', `Decomposed into ${subQueries.length} sub-queries. Subject: ${subject || 'None'}`);

  // ─── STEP 4: HYBRID RETRIEVAL ─────────────────────────────────────────────
  const allChunks = new Map();
  for (const sq of subQueries) {
    // Fetch top 20 for this subquery
    const chunks = await performHybridSearch(sq.query, sq.category, sq.filters);
    chunks.forEach(c => {
      const id = c._id?.toString() || c.content?.slice(0, 30);
      if (!allChunks.has(id) || allChunks.get(id).score < c.score) {
        allChunks.set(id, c);
      }
    });
  }

  // ─── STEP 8: RERANKING ENFORCEMENT ───────────────────────────────────────
  let mergedTop20 = Array.from(allChunks.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 20);

  log('STEP-8', `Sending ${mergedTop20.length} chunks to Reranker`);
  let top5Chunks = await rerankChunks(contextualQuery, mergedTop20);
  
  log('STEP-8', `Reranker completed. Top score: ${top5Chunks[0]?.rerankScore || top5Chunks[0]?.score || 0}`, 
      top5Chunks.slice(0,3).map(c => ({ title: c.title, score: c.rerankScore || c.score })));

  // ─── STEP 9: CONFIDENCE SCORING — targeted retry ─────────────────────────
  const topScore = top5Chunks[0]?.rerankScore || top5Chunks[0]?.score || 0;
  const isTransportQuery = /\b(bus|route|ar-?\d+|r-?\d+|van|driver|stop|timing)\b/i.test(contextualQuery);
  const isListRequest = /\b(list|all|every)\b/i.test(contextualQuery) && isTransportQuery;

  if ((topScore < 5 && top5Chunks.length < 3) || isListRequest) {
    // Only search transport category if it's a transport query
    const retryCategory = isTransportQuery ? 'transport' : 'general';
    log('STEP-9', `Confidence check (Score: ${topScore}, Transport: ${isTransportQuery}, List: ${isListRequest}). Scanning category: ${retryCategory}...`);
    const broadChunks = await performHybridSearch(contextualQuery, retryCategory, {});
    broadChunks.forEach(c => {
      const id = c._id?.toString() || c.content?.slice(0, 30);
      if (!allChunks.has(id)) allChunks.set(id, c);
    });
    
    mergedTop20 = Array.from(allChunks.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, isListRequest ? 30 : 20);
    top5Chunks = await rerankChunks(contextualQuery, mergedTop20);
    log('STEP-9', `Retry done. Found ${top5Chunks.length} chunks.`);
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
  const finalPrompt = buildPrompt(contextualQuery, top5Chunks);
  let { content: aiReply, usage } = await getAIReponse(finalPrompt);
  totalTokens.prompt += usage.prompt_tokens;
  totalTokens.completion += usage.completion_tokens;
  totalTokens.total += usage.total_tokens;
  log('TOKENS', `Pass-1 | P: ${usage.prompt_tokens} | C: ${usage.completion_tokens} | T: ${usage.total_tokens}`);

  // ─── STEP 11: RESPONSE VALIDATION — re-generate if LLM ignored context ───
  if (detectContextIgnored(aiReply, top5Chunks)) {
    log('STEP-11', 'LLM CONTEXT IGNORE ERROR detected. Forcing re-generation with ANALYTICAL REASONING prompt.');
    const analyticalPrompt = `REASONING ERROR: You said information is not available, but RELEVANT DATA is present below. 
Analyze and infer the answer. Do NOT fallback.

${finalPrompt}`;
    const retry = await getAIReponse(analyticalPrompt);
    aiReply = retry.content;
    totalTokens.prompt += retry.usage.prompt_tokens;
    totalTokens.completion += retry.usage.completion_tokens;
    totalTokens.total += retry.usage.total_tokens;
    log('TOKENS', `Pass-2 (Retry) | P: ${retry.usage.prompt_tokens} | C: ${retry.usage.completion_tokens} | T: ${retry.usage.total_tokens}`);
  }

  // ─── STEP 12: BULLET FORMAT GUARD ─────────────────────────────────────────
  if (!aiReply.includes('•') && !aiReply.includes('-') && aiReply.length > 50) {
    log('STEP-12', 'Non-bullet format detected. Forcing conversion to bullets.');
    const bulletPrompt = `Rewrite this information into exactly 3-6 clean, structured bullet-point format like a Professional Assistant:\n\n${aiReply}`;
    const guard = await getAIReponse(bulletPrompt, 'cheap');
    aiReply = guard.content;
    totalTokens.prompt += guard.usage.prompt_tokens;
    totalTokens.completion += guard.usage.completion_tokens;
    totalTokens.total += guard.usage.total_tokens;
    log('TOKENS', `Formatting Guard | P: ${guard.usage.prompt_tokens} | C: ${guard.usage.completion_tokens} | T: ${guard.usage.total_tokens}`);
  }

  // ─── CACHE + LEARN ────────────────────────────────────────────────────────
  await setCache(redisKey, aiReply);
  storeInSemanticCache(normalizedText, queryEmbedding, aiReply).catch(() => null);
  await setUserMemory(chatId, subject || memory.last_entity, subQueries[0]?.category || 'general', rawText).catch(() => null);
  await pushLog('assistant', 'info', `RAG: ${rawText.slice(0, 50)}`, { 
    query: rawText, 
    tokens: totalTokens,
    latency: Date.now() - startTime,
    shards: top5Chunks.length 
  }).catch(() => null);

  return {
    aiReply,
    source: 'rag_generated',
    latency: Date.now() - startTime,
    chunkCount: top5Chunks.length,
    totalTokens
  };
}
