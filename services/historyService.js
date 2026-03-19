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

  // 1. GREETING/SOCIAL DETECTION: Never rewrite
  const greetings = /\b(hi|hello|hey|hlo|name is|i am|this is)\b/i;
  if (greetings.test(q)) return query;

  // 2. NAMED ENTITY RESET: "who is X", "what is X", "tell about X", "info about X"
  // If user explicitly names a new subject → hard topic reset, no context bind.
  const namedEntityQuery = /\b(who is|who are|what is|tell me about|tell about|info (about|on)|details (of|about)|about)\s+\w+/i;
  if (namedEntityQuery.test(query)) {
    logger.info(`Named Entity Reset: "${query}" — treating as fresh query`);
    return query;
  }

  // 3. PROPER NOUN DETECTION: "yogesh", "srinivasan", "raju" typed alone
  // If all meaningful words are proper nouns (start with capital in original), reset context.
  const meaningfulWords = query.trim().split(/\s+/).filter(w => w.length > 2);
  const hasProperNoun = meaningfulWords.some(w => /^[A-Z]/.test(w));
  if (hasProperNoun && words.length <= 4) {
    logger.info(`Proper Noun Reset: "${query}" — treating as fresh query`);
    return query;
  }

  // 5. ROUTE MISMATCH RESET: Different route number = fully fresh query
  // Matches any pattern like ar5, r22, ar-8, R22, etc.
  const routePattern = /\b(ar-?\d+|r-?\d+)\b/i;
  const queryHasRoute = routePattern.test(query);
  const lastEntityHasRoute = routePattern.test(last_entity || '');

  if (queryHasRoute) {
    // Extract the route number from the current query and from memory
    const queryRoute = (query.match(routePattern) || [])[0]?.toLowerCase().replace(/[-\s]/g, '');
    const lastRoute = ((last_entity || '').match(routePattern) || [])[0]?.toLowerCase().replace(/[-\s]/g, '');
    // If it's a different route OR there's any route in the query, always treat as fresh
    if (!lastEntityHasRoute || queryRoute !== lastRoute) {
      logger.info(`Route Mismatch Reset: "${query}" (query: ${queryRoute}, memory: ${lastRoute}) — fresh query`);
      return query;
    }
  }

  // 6. PRONOUN/HOOK DETECTION: he/his/contact/timing/more/list
  const pronouns = /\b(him|her|it|them|they|he|she|his|hers|that|this|the timing|phone|contact|more|detail|list)\b/i;
  const hasPronoun = pronouns.test(q);

  // 5. NOUN CLASH: user asks about transport but last entity was admin person (or vice versa)
  const transportKeywords = /\b(bus|route|ar-|van|driver|ar5|ar8|ar6|ar7|r-)\b/i;
  const adminKeywords = /\b(principal|srinivasan|head|hod|office|admissions)\b/i;
  const currentTopicIsTransport = transportKeywords.test(q);
  const lastTopicWasAdmin = adminKeywords.test((last_entity || last_topic || '').toLowerCase());
  if (currentTopicIsTransport && lastTopicWasAdmin) return query;

  // 6. SHORT VAGUE FOLLOW-UPS ONLY: "timing?", "contact?", "fees?"
  // EXCLUDE "who is", "what is" — those are handled above as resets.
  const isShortFollowUp = words.length <= 3 && !/who|what|which|bus|principal|fee|hostel/i.test(q);

  if (hasPronoun || isShortFollowUp) {
    const context = last_entity || last_topic;
    logger.info(`Context Bound: "${query}" -> "${query} about ${context}"`);
    return `${query} about ${context}`;
  }
  
  return query;
};
