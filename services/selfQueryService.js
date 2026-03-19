import logger from '../utils/logger.js';
import { getAIReponse } from './aiService.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `Goal: Decompose this academic question for RAG retrieval. 
STRICT REQUIREMENT: Preserve all specific intent keywords like "driver", "HOD", "Principal", "timing", "phone".
MULTI-PART QUERIES: If the user asks multiple things (using 'and', 'also', etc.), split them into small, independent sub-queries.
Example: "Who is the principal and what is his phone number?" -> Output 2 separate queries.

User Question: "${query}"

Output EXACT ONLY JSON array (no markdown):
[
  {
    "query": "First independent question",
    "category": "transport|faculty|general|admin",
    "filters": {}
  },
  {
    "query": "Second independent question (if needed)",
    "category": "transport|faculty|general|admin",
    "filters": {}
  }
]`;

    const content = await getAIReponse(prompt, 'cheap');
    
    try {
        const jsonMatch = content.match(/\[.*\]/s);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        
        return (Array.isArray(parsed) ? parsed : [parsed]).map(p => ({
            query: p.query || p.decomposedQuestion || query,
            category: p.category || 'general',
            filters: p.filters || {}
        }));
    } catch(e) {
        logger.warn(`Self-query JSON parse failed: ${e.message}`);
    }
  } catch (e) {
    logger.warn(`Query Decomposition failed: ${e.message}`);
  }
  
  // Fallback
  return [{ query: query, category: 'general', filters: {} }];
};
