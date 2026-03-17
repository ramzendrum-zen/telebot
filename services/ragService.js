import { performHybridSearch } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from './historyService.js';
import { normalizeQueryBasic } from './normalizationService.js';
import { checkSemanticCache, storeInSemanticCache } from './faqLearningService.js';
import { decomposeAndSelfQuery } from './selfQueryService.js';
import { rerankChunks } from './rerankService.js';
import { generateEmbedding } from './embeddingService.js';
import { getCache, setCache } from './cacheService.js';
import logger from '../utils/logger.js';

/**
 * Standardized RAG Pipeline for MSAJCE Assistant & Grievance Bots
 */
export async function processRAGQuery(chatId, rawText) {
  const startTime = Date.now();
  
  // 1. Normalize Query
  const { normalizedText, cacheKey } = normalizeQueryBasic(rawText);
  const redisKey = `v18:rag:${cacheKey}`;

  // 2. Check Strict Redis Cache
  const cached = await getCache(redisKey);
  if (cached) return { aiReply: cached, source: 'redis', latency: Date.now() - startTime };

  // 3. Generate Embedding & Check Semantic FAQ Cache
  const queryEmbedding = await generateEmbedding(normalizedText);
  const faqAnswer = await checkSemanticCache(queryEmbedding);
  if (faqAnswer) return { aiReply: faqAnswer, source: 'semantic_cache', latency: Date.now() - startTime };

  // 4. Query Context & Decomposition
  const memory = await getUserMemory(chatId);
  const contextualQuery = rewriteQuery(normalizedText, memory);
  const subQueries = await decomposeAndSelfQuery(contextualQuery);

  // 5. Hybrid Retrieval
  const allChunks = new Map();
  for (const sq of subQueries) {
    const chunks = await performHybridSearch(sq.query, sq.category, sq.filters);
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

  // 6. Cross-Encoder Reranking
  const top5Chunks = await rerankChunks(contextualQuery, mergedTop20);

  if (top5Chunks.length === 0) {
      return { 
        aiReply: "I currently do not have that specific information in the MSAJCE knowledge base. Please contact the administrative office for details.", 
        source: 'no_data', 
        latency: Date.now() - startTime 
      };
  }

  // 7. Generate LLM Answer
  const finalPrompt = buildPrompt(contextualQuery, top5Chunks, memory.last_entity);
  const aiReply = await getAIReponse(finalPrompt);

  // 8. Output, Cache, & Learn
  await setCache(redisKey, aiReply);
  storeInSemanticCache(normalizedText, queryEmbedding, aiReply).catch(()=>null);
  await setUserMemory(chatId, contextualQuery, subQueries[0]?.category || 'general', rawText).catch(()=>null);

  return { 
    aiReply, 
    source: 'rag_generated', 
    latency: Date.now() - startTime,
    chunkCount: top5Chunks.length 
  };
}
