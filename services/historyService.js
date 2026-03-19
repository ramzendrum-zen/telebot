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

import { getAIReponse } from './aiService.js';

export const rewriteQuery = async (query, memory) => {
  const { last_entity, last_topic, last_question } = memory;
  if (!last_entity && !last_topic) return query;
  
  const q = query.toLowerCase().trim();

  // DETECTION RULES: Detect if this is likely a follow-up
  const followUpKeywords = ['timing', 'phone', 'contact', 'more', 'another', 'details', 'who', 'where', 'list', 'what about'];
  const isShort = q.split(/\s+/).length <= 4;
  const hasPronoun = /\b(him|her|it|them|they|he|she|his|hers|that|this)\b/i.test(q);
  const startWithVague = /^(what|how|who|where|when|list|give|show|tell)\s*\?*$/i.test(q);
  const isVagueKeyword = followUpKeywords.some(kw => q.includes(kw));

  // GREETING DETECTION: Skip rewrite for greetings
  const greetings = /\b(hi|hello|hey|hlo|good morning|namaste|morning|evening|greetings)\b/i;
  if (greetings.test(q) && q.split(/\s+/).length <= 2) {
    return query;
  }

  const isFollowUp = (isShort || hasPronoun || startWithVague || isVagueKeyword) && !greetings.test(q);

  if (!isFollowUp) {
    // RESET RULE: If user asks completely new topic/entity, don't rewrite.
    return query;
  }

  try {
    const rewritePrompt = `Goal: Rewrite follow-up question into a complete independent query.
Context:
- Previous Topic: ${last_topic}
- Previous Entity: ${last_entity}
- Previous Question: ${last_question}

User Follow-up: "${query}"

Rules:
1. Attach the previous entity/subject if missing.
2. Preserve original intent exactly.
3. Be direct. No filler.

Rewritten Query:`;

    const { content: rewritten } = await getAIReponse(rewritePrompt, 'cheap');
    const finalQuery = rewritten.replace(/["']/g, '').trim();
    
    logger.info(`Context Rewrite: "${query}" -> "${finalQuery}" (Entity: ${last_entity})`);
    return finalQuery;
  } catch (e) {
    logger.warn(`Query rewrite failed: ${e.message}`);
    return query;
  }
};
