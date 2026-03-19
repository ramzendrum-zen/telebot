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

/**
 * REWRITE QUERY PIPELINE
 * Handles pronouns like him/her/it/more by injecting context.
 */
export const rewriteQuery = (query, memory) => {
  const { last_entity, last_topic } = memory;
  if (!last_entity && !last_topic) return query;
  
  const q = query.toLowerCase().trim();
  const context = last_entity || last_topic;

  const pronouns = ['him', 'her', 'it', 'them', 'they', 'those', 'he', 'she'];
  const hasPronoun = pronouns.some(p => new RegExp(`\\b${p}\\b`, 'i').test(q));
  
  // Catch list/enumerate follow-ups: "list out all", "name them", "show all", "give the list"
  const isListFollowUp = /^(list|show|give|name|mention|tell|what are|enumerate)\b|list (out\s*)?all|show all|name (them|all|it)/i.test(q);
  
  // Catch very short follow-ups (< 5 words, no clear noun)
  const isShortContinuation = q.split(/\s+/).length <= 4 && !/college|bus|route|ar-|faculty|principal|hostel|fee/i.test(q);
  
  const isContinuation = /\b(more|tell me more|detail|elaborate|explain)\b/i.test(q);

  if (hasPronoun || isContinuation || isListFollowUp || isShortContinuation) {
    return `${query} about ${context}`;
  }
  
  return query;
};
