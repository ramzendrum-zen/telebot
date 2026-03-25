import User from '../database/models/User.js';
import logger from '../utils/logger.js';

/**
 * PRODUCTION-GRADE PERSISTENT MEMORY SERVICE
 * Stores context in MongoDB as per Senior Architect request.
 */
export const getUserMemory = async (chatId) => {
  try {
    const user = await User.findOne({ telegram_id: chatId });
    if (!user) return { last_entity: null, last_topic: null, last_question: null };
    return { 
        last_entity: user.last_entity, 
        last_topic: user.last_topic, 
        last_question: user.last_question 
    };
  } catch (error) {
    logger.error(`Memory Get Error: ${error.message}`);
    return { last_entity: null, last_topic: null, last_question: null };
  }
};

export const setUserMemory = async (chatId, entity, topic = 'general', question = '') => {
  try {
    await User.findOneAndUpdate(
        { telegram_id: chatId },
        { 
            last_entity: entity, 
            last_topic: topic, 
            last_question: question,
            updated_at: Date.now() 
        },
        { upsert: false } // Assumes user already created by getOrCreateUser
    );
  } catch (error) {
    logger.error(`Memory Set Error: ${error.message}`);
  }
};

import { buildQueryRewritingPrompt } from '../utils/promptBuilder.js';
import { getAIReponse } from './aiService.js';

export const rewriteQuery = async (query, memory) => {
  const { last_entity, last_topic, last_question } = memory;
  if (!last_entity && !last_topic && !last_question) return query; // No memory, return query as is
  
  // Format history as single block for LLM
  const historyString = `Last Question: ${last_question || 'None'}
Last Answer Context Topic: ${last_topic || 'None'}
Last Answer Context Entity: ${last_entity || 'None'}`;

  const rewritePrompt = buildQueryRewritingPrompt(query, historyString);
  
  try {
      const response = await getAIReponse(rewritePrompt, 'cheap'); // use fast model
      const rewrittenQuery = response.content.trim().replace(/^"|"$/g, ''); // strip quotes just in case
      logger.info(`AI Rewrote Query: "${query}" -> "${rewrittenQuery}"`);
      return rewrittenQuery;
  } catch (error) {
      logger.error(`AI Query Rewrite failed, falling back to original: ${error.message}`);
      return query;
  }
};
