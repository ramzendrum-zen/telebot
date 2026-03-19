import logger from '../utils/logger.js';
import { getAIReponse } from './aiService.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `Goal: Decompose this academic question for RAG retrieval. 
STRICT REQUIREMENT: Preserve all specific intent keywords like "driver", "HOD", "Principal", "timing", "phone".
Example: "Who is the driver for AR-8?" -> Output Query: "Who is the driver for bus route AR-8?"

User Question: "${query}"

Output EXACT ONLY JSON array (no markdown):
[
  {
    "query": "Full question including role/intent",
    "category": "transport|faculty|general|admin",
    "filters": { "route": "AR-8", "name": "Principal" }
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
