import { performHybridSearch } from './retrievalService.js';
import { getAIReponse } from './aiService.js';
import { buildReasoningPrompt, buildOutputFilterPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory } from './historyService.js';
import { pushLog } from './monitorService.js';
import logger from '../utils/logger.js';

/**
 * PROJECT PHOENIX: PRODUCTION RAG & ENTITY ENGINE
 * 
 * Objectives:
 * 1. Final entity accuracy (0% hallucination)
 * 2. 0 manual patching (No map required)
 * 3. Exact matching for people.
 * 4. RAG for general questions.
 */
export async function processRAGQuery(chatId, rawText) {
  const startTime = Date.now();
  const normalizedText = rawText.trim();
  
  try {
    // 1. Contextualize Query (Resolves pronouns from memory)
    const memory = await getUserMemory(chatId);
    
    // 2. High-Precision Retrieval (Entity-Aware)
    const searchData = await performHybridSearch(normalizedText);

    // ─── STAGE 1: ENTITY MATCH HANDLING ─────────────────────
    if (searchData.type === 'entity') {
      const { results, confidence } = searchData;

      if (results.length === 1) {
          // SINGLE MATCH: 100% Accuracy (No Reasoning Layer)
          const person = results[0];
          const aiReply = `Information for ${person.metadata.name}:\n\n- Role: ${person.metadata.role}\n- Department: ${person.metadata.department}\n\n${person.text.split('. ').slice(1, 3).join('. ')}`;
          
          await setUserMemory(chatId, person.metadata.name, 'profile', rawText);
          await pushLog('assistant', 'info', `Entity HIT: ${person.metadata.name}`, { latency: Date.now() - startTime });
          
          return { aiReply, source: 'entity_exact', latency: Date.now() - startTime };
      } else {
          // MULTIPLE MATCHES: Professional Clarification
          const names = results.map(r => r.metadata.name).join(' or ');
          const aiReply = `I found multiple people matching your request: ${names}. Which one did you mean? (e.g. ${results[0].metadata.name})`;
          
          await pushLog('assistant', 'info', `Entity AMBIGUOUS: ${results.length}`, { latency: Date.now() - startTime });
          return { aiReply, source: 'entity_disambiguate', latency: Date.now() - startTime };
      }
    }

    // ─── STAGE 2: RAG HANDLING ──────────────────────────────
    if (!searchData.results || searchData.results.length === 0) {
       logger.warn(`Phoenix RAG: No data or rejected (failure: ${searchData.failure})`);
       return {
         aiReply: "I'm sorry, I don't have that specific information in the official MSAJCE database.",
         source: 'no_data',
         latency: Date.now() - startTime
       };
    }

    // 3. Stage 1: CORE REASONING (Strict Grounding)
    const chatHistoryContext = `Last Question: ${memory.last_question || 'None'}\nLast Topic: ${memory.last_topic || 'None'}`;
    const reasoningPrompt = buildReasoningPrompt(normalizedText, searchData.results, chatHistoryContext);
    
    const { content: rawReasoning, usage: usage1 } = await getAIReponse(reasoningPrompt, 'advanced');

    // 4. Stage 2: UX OUTPUT FILTERING
    const outputPrompt = buildOutputFilterPrompt(rawReasoning, chatHistoryContext);
    const { content: aiReply, usage: usage2 } = await getAIReponse(outputPrompt, 'cheap');

    // 5. MEMORY UPDATE
    const topChunk = searchData.results[0];
    const detectedEntity = topChunk.metadata?.name || normalizedText.slice(0, 20);
    await setUserMemory(chatId, detectedEntity, topChunk.category || 'general', normalizedText);

    // 6. MANDATORY PHOENIX LOGGING
    await pushLog('assistant', 'info', `Phoenix Query: ${rawText.slice(0, 30)}`, { 
        latency: Date.now() - startTime,
        retrieval_type: searchData.type || 'rag',
        detected_entities: searchData.type === 'entity' ? searchData.results.map(r => r.metadata.name) : [],
        scores: searchData.results.map(r => r.score.toFixed(2)),
        selected_documents: searchData.results.map(r => r.metadata.name || r.category || 'general'),
        rejection_reason: searchData.failure || 'none'
    }).catch(() => null);

    return {
      aiReply,
      source: 'rag_phoenix',
      latency: Date.now() - startTime,
      chunkCount: searchData.results.length
    };

  } catch (error) {
    logger.error(`Phoenix RAG System Error: ${error.message}`);
    return { 
        aiReply: "I'm sorry, I encountered an error while searching for that information. Please try again soon.", 
        source: 'error',
        latency: Date.now() - startTime 
    };
  }
}
