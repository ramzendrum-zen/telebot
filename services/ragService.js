import { performHybridSearch } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildReasoningPrompt, buildOutputFilterPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory } from './historyService.js';
import { pushLog } from './monitorService.js';
import { normalize } from '../utils/textUtils.js';
import logger from '../utils/logger.js';

export async function processRAGQuery(chatId, rawText) {
  const startTime = Date.now();
  const normalizedQuery = normalize(rawText);
  
  try {
    const memory = await getUserMemory(chatId);
    const searchData = await performHybridSearch(rawText);

    // ─── STAGE 1: HYBRID HANDLING (Entity + RAG) ────────
    if (searchData.type === 'hybrid') {
      let entityPart = '';
      let ragPart = '';

      // A. Entity Processing (Deterministic)
      if (searchData.entityResponse) {
        const ent = searchData.entityResponse;
        entityPart = `Name: ${ent.name}\nRole: ${ent.role}\nDepartment: ${ent.department}`;
        // If content is role-based but specific detail exists, add it
        if (ent.content && ent.content.length > 5 && !ent.content.includes(ent.name)) {
            entityPart += `\n${ent.content}`;
        }
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

      // C. Rejection Logic (Step 8 Hybrid)
      if (!entityPart && !ragPart) {
        return {
          aiReply: "I couldn’t find that in the MSAJCE data. Try asking about staff, departments, transport, or facilities.",
          source: 'no_data_hybrid',
          latency: Date.now() - startTime
        };
      }

      // D. Combined Response (Production Grade)
      const aiReply = [entityPart, ragPart].filter(p => p.length > 0).join('\n\n').trim();

      // Memory & Logging
      if (searchData.entityResponse) {
        await setUserMemory(chatId, searchData.entityResponse.name, 'profile', rawText);
      }

      await pushLog('assistant', 'info', `Hybrid HIT: ${rawText.slice(0, 30)}`, { 
          latency: Date.now() - startTime,
          path: 'HYBRID_FINAL',
          entity: !!entityPart,
          rag: !!ragPart
      });

      return { aiReply, source: 'hybrid_final', latency: Date.now() - startTime };
    }

    // Fallback Rejection
    return {
      aiReply: "I couldn’t find that in the MSAJCE data. Try asking about staff, departments, transport, or facilities.",
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


