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

export const rewriteQuery = (query, memory) => {
  const { last_entity, last_topic } = memory;
  if (!last_entity && !last_topic) return query;
  
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  // 1. GREETING/SOCIAL DETECTION: Never rewrite social fluff
  const greetings = /\b(hi|hello|hey|hlo|name is|i am|this is)\b/i;
  if (greetings.test(q)) return query;

  // 2. PRONOUN/HOOK DETECTION: he/his/it/more/timing/phone/list
  const pronouns = /\b(him|her|it|them|they|he|she|his|hers|that|this|the timing|phone|contact|more|detail|list)\b/i;
  const hasPronoun = pronouns.test(q);

  // 3. NOUN CLASH: If the user says "buses" but last_entity was "Principal", do NOT rewrite.
  // This is a topic shift.
  const transportKeywords = /\b(bus|route|ar-|van|driver|ar5|ar8|r-)\b/i;
  const adminKeywords = /\b(principal|srinivasan|head|hod|office|admissions)\b/i;
  
  const currentTopicIsTransport = transportKeywords.test(q);
  const lastTopicWasAdmin = adminKeywords.test((last_entity || last_topic || '').toLowerCase());
  
  if (currentTopicIsTransport && lastTopicWasAdmin) {
    return query; // Topic shift detected
  }

  // 4. VAGUE/SHORT HOOKS: "timing?", "contact?", "fees?"
  const isShortFollowUp = words.length <= 4 && !/bus|principal|fee|hostel/i.test(q);

  if (hasPronoun || isShortFollowUp) {
    const context = last_entity || last_topic;
    logger.info(`Context Bound: "${query}" -> "${query} about ${context}"`);
    return `${query} about ${context}`;
  }
  
  return query;
};
