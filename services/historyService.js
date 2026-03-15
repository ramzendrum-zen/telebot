import { Redis } from '@upstash/redis';
import config from '../config/config.js';
import logger from '../utils/logger.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

/**
 * PRODUCTION-GRADE MEMORY SERVICE
 * Stores both the raw subject and the semantic topic for better follow-ups.
 */
export const getUserMemory = async (chatId) => {
  try {
    const memory = await redis.get(`mem:v2:${chatId}`);
    return memory || { last_entity: null, last_topic: null };
  } catch (error) {
    logger.error(`Memory Get Error: ${error.message}`);
    return { last_entity: null, last_topic: null };
  }
};

export const setUserMemory = async (chatId, entity, topic = 'general') => {
  try {
    const memory = { last_entity: entity, last_topic: topic, timestamp: Date.now() };
    await redis.set(`mem:v2:${chatId}`, JSON.stringify(memory), { ex: 1800 }); // 30 mins
  } catch (error) {
    logger.error(`Memory Set Error: ${error.message}`);
  }
};

/**
 * REWRITE QUERY PIPELINE
 * Handles pronouns like him/her/it/more by injecting context.
 */
export const rewriteQuery = (query, memory) => {
  const { last_entity } = memory;
  if (!last_entity) return query;
  
  const q = query.toLowerCase();
  const pronouns = ['him', 'her', 'it', 'them', 'they', 'those', 'he', 'she'];
  const hasPronoun = pronouns.some(p => new RegExp(`\\b${p}\\b`, 'i').test(q));
  const isContinuation = /\b(more|tell me more|detail|elaborate|explain)\b/i.test(q);

  if (hasPronoun || isContinuation) {
    return `${query} (specifically regarding ${last_entity})`;
  }
  
  return query;
};
