import { performHybridSearch } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildReasoningPrompt, buildOutputFilterPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory } from './historyService.js';
import { pushLog } from './monitorService.js';
import { normalize } from '../utils/textUtils.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// -----------------------------
// BASIC RATE LIMITER
// -----------------------------
const userRequests = new Map();
const RATE_LIMIT_MS = 1500; // 1.5 seconds between requests

export async function processRAGQuery(chatId, rawText) {
  const startTime = Date.now();
  const normalizedQuery = normalize(rawText);
  
  // 1. Rate Limiting Check
  const lastReq = userRequests.get(chatId) || 0;
  if (Date.now() - lastReq < RATE_LIMIT_MS) {
      return { aiReply: "Slow down! Please wait a moment between questions.", source: 'rate_limit' };
  }
  userRequests.set(chatId, Date.now());

  try {
    const memory = await getUserMemory(chatId);
    const searchData = await performHybridSearch(rawText);
    const db = mongoose.connection.db;

    // ─── STAGE 1: HYBRID HANDLING (Entity + RAG) ────────
    if (searchData.type === 'hybrid') {
      let entityPart = '';
      let ragPart = '';

      // A. Entity Processing (Deterministic)
      if (searchData.entityResponse) {
        const ent = searchData.entityResponse;
        // Check if content already contains formatted info
        entityPart = ent.content || `Name: ${ent.name}\nRole: ${ent.role}\nDepartment: ${ent.department}`;
      }

      // B. RAG Processing (Generative)
      if (searchData.ragResults && searchData.ragResults.length > 0) {
        const chatHistoryContext = `Last Question: ${memory.last_question || 'None'}\nLast Topic: ${memory.last_topic || 'None'}`;
        const reasoningPrompt = buildReasoningPrompt(rawText, searchData.ragResults, chatHistoryContext);
        
        const { content: rawReasoning } = await getAIReponse(reasoningPrompt, 'advanced');
        const outputPrompt = buildOutputFilterPrompt(rawReasoning, chatHistoryContext);
        const { content: filteredReply } = await getAIReponse(outputPrompt, 'cheap');
        
        ragPart = filteredReply;
      }

      // C. Failure Analytics
      if (!entityPart && !ragPart) {
        db.collection('failed_queries').insertOne({
            query: rawText,
            normalized: normalizedQuery,
            timestamp: new Date(),
            chatId
        }).catch(() => null);

        return {
          aiReply: "I couldn’t find that in the MSAJCE data. Try asking about staff, departments, transport, or facilities.",
          source: 'no_data_hybrid',
          latency: Date.now() - startTime
        };
      }

      // D. Combined Response (CLEAN OUTPUT)
      const aiReply = [entityPart, ragPart].filter(p => p.length > 0).join('\n\n').trim();

      // Memory & Logging
      if (searchData.entityResponse) {
        await setUserMemory(chatId, searchData.entityResponse.name, 'profile', rawText);
      }

      await pushLog('assistant', 'info', `Hybrid HIT: ${rawText.slice(0, 30)}`, { 
          latency: Date.now() - startTime,
          path: 'HYBRID_FINAL',
          entity: !!entityPart,
          rag: !!ragPart,
          cached: !!searchData.timestamp && (Date.now() - searchData.timestamp > 100)
      });

      return { aiReply, source: 'hybrid_final', latency: Date.now() - startTime };
    }

    return {
      aiReply: "I couldn’t find that in the MSAJCE data.",
      source: 'fallback_rejection',
      latency: Date.now() - startTime
    };

  } catch (error) {
    logger.error(`RAG System Error: ${error.message}`);
    return { 
        aiReply: "I'm having trouble connecting right now. Please try again later.", 
        source: 'error',
        latency: Date.now() - startTime 
    };
  }
}



