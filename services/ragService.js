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

    // ─── STAGE 1: ENTITY MATCH HANDLING (Upgrade Pack) ────────
    if (searchData.type === 'multi_entity') {
      const { entities } = searchData;
      
      logger.info(`Routing to MULTI-ENTITY path: ${entities.length} detected.`);

      let combinedResponse = '';
      const detectedNames = [];

      for (const ent of entities) {
          const results = ent.data;
          
          if (results.length === 1) {
              const person = results[0];
              const label = ent.subtype === 'role' ? `${person.role} (${person.department || 'Admin'})` : person.name;
              combinedResponse += `• *${label}*\n${person.content}\n\n`;
              detectedNames.push(person.name);
          } else {
              const names = results.map(r => r.name).join(', ');
              combinedResponse += `• I found multiple people matching "${ent.query_segment}": ${names}. Please specify the department.\n\n`;
          }
      }

      const aiReply = combinedResponse.trim();
      
      // Update memory with the first one detected
      if (detectedNames.length > 0) {
          await setUserMemory(chatId, detectedNames[0], 'profile', rawText);
      }

      await pushLog('assistant', 'info', `Entity HIT: ${detectedNames.join(', ')}`, { 
          latency: Date.now() - startTime,
          path: 'ENTITY_UPGRADE',
          normalized_query: normalizedQuery,
          entities_count: entities.length,
          confidence: 'high'
      });
      
      return { aiReply, source: 'entity_upgrade', latency: Date.now() - startTime };
    }

    // ─── STAGE 2: RAG HANDLING ──────────────────────────────
    // Step 8: Enhanced Rejection Logic
    if (!searchData.results || searchData.results.length === 0) {
       logger.warn(`RAG Reject: No data found for "${rawText}"`);
       return {
         aiReply: "I couldn’t find that in the MSAJCE data. Try asking about staff, departments, transport, or facilities.",
         source: 'no_data',
         latency: Date.now() - startTime
       };
    }

    // Stage 3: CORE REASONING (No fallback for entities happens here)
    const chatHistoryContext = `Last Question: ${memory.last_question || 'None'}\nLast Topic: ${memory.last_topic || 'None'}`;
    const reasoningPrompt = buildReasoningPrompt(rawText, searchData.results, chatHistoryContext);
    
    const { content: rawReasoning } = await getAIReponse(reasoningPrompt, 'advanced');

    // Stage 4: UX OUTPUT FILTERING
    const outputPrompt = buildOutputFilterPrompt(rawReasoning, chatHistoryContext);
    const { content: aiReply } = await getAIReponse(outputPrompt, 'cheap');

    // Logging & Memory
    const topChunk = searchData.results[0];
    await setUserMemory(chatId, topChunk.metadata?.name || 'general', topChunk.category || 'general', rawText);

    await pushLog('assistant', 'info', `RAG Query: ${rawText.slice(0, 30)}`, { 
        latency: Date.now() - startTime,
        retrieval_path: 'RAG',
        normalized_query: normalizedQuery,
        top_score: searchData.results[0].score.toFixed(2),
        match_confidence: 'medium'
    }).catch(() => null);

    return {
      aiReply,
      source: 'rag_phoenix',
      latency: Date.now() - startTime,
      chunkCount: searchData.results.length
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

