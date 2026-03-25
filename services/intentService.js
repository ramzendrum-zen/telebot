import { buildIntentClassifierPrompt } from '../utils/promptBuilder.js';
import { getAIReponse } from './aiService.js';
import logger from '../utils/logger.js';

/**
 * Detects the user's intent using LLM Classification.
 */
export const detectIntent = async (query) => {
  const prompt = buildIntentClassifierPrompt(query);
  try {
    const response = await getAIReponse(prompt, 'cheap');
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return 'rag'; // Default fallback
    const parsed = JSON.parse(jsonMatch[0]);
    logger.info(`Intent Detected: ${parsed.intent} (Confidence: ${parsed.confidence})`);
    return parsed.intent;
  } catch (error) {
    logger.error(`Intent LLM Failed: ${error.message}`);
    return 'rag';
  }
};

/**
 * Normalizes common variations in college terminology.
 */
export const normalizeQuery = (query) => {
  let q = query.toLowerCase().trim();
  
  // Handle AR8/AR-8 variations
  q = q.replace(/ar\s?(\d+)/g, 'ar-$1');
  q = q.replace(/r\s?(\d+)/g, 'r-$1');
  
  // Common nicknames/shorthand
  // Removing hardcoded 'ram' -> 'ramanathan' as it lacks data support
  
  return q;
};
