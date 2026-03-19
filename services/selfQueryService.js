import logger from '../utils/logger.js';
import { getAIReponse } from './aiService.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `Goal: Decompose this academic question for RAG retrieval. 
STRICT REQUIREMENT: Preserve all specific intent keywords like "driver", "HOD", "Principal", "timing", "phone".
MULTI-PART QUERIES: If the user asks multiple things (using 'and', 'also', etc.), split them into small, independent sub-queries.
SUBJECT EXTRACTION: Identify the primary entity/subject (e.g., "AR-8", "Principal", "Hostel").

User Question: "${query}"

Output EXACT ONLY JSON (no markdown):
{
  "subject": "The primary subject (entity/noun)",
  "queries": [
    {
      "query": "Independent question 1",
      "category": "transport|faculty|general|admin",
      "filters": {}
    }
  ]
}`;

    const content = await getAIReponse(prompt, 'cheap');
    
    try {
        const jsonMatch = content.match(/\{.*\}/s);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        const queries = Array.isArray(parsed.queries) ? parsed.queries : [parsed.queries || parsed];
        
        return {
          subject: parsed.subject || null,
          subQueries: queries.map(p => ({
            query: p.query || p.decomposedQuestion || query,
            category: p.category || 'general',
            filters: p.filters || {}
          }))
        };
    } catch(e) {
        logger.warn(`Self-query JSON parse failed: ${e.message}`);
    }
  } catch (e) {
    logger.warn(`Query Decomposition failed: ${e.message}`);
  }
  
  // Fallback
  return { subject: null, subQueries: [{ query: query, category: 'general', filters: {} }] };
};
