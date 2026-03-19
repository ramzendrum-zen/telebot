import logger from '../utils/logger.js';
import { getAIReponse } from './aiService.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `Goal: Decompose this question for RAG retrieval.
STRICT RULES:
1. Preserve specific intent keywords: "driver", "HOD", "Principal", "timing", "phone", "contact".
2. Route numbers with spaces ("ar 5", "ar 8", "r 22") must be written as "AR-5", "AR-8", "R-22" in the output query.
3. Driver contact queries ("raju contact", "ar8 driver contact", "contact velu", "how to contact [name]") → category = "transport".
4. Scholarship, fee, hostel, faculty queries → category = "general" or "admin".
5. If multi-part, split into independent sub-queries.

User Question: "${query}"

Output EXACT JSON only (no markdown, no explanation):
{
  "subject": "Primary entity (e.g. AR-8, Yogesh, Principal, Raju)",
  "queries": [
    {
      "query": "Rewritten independent question",
      "category": "transport|faculty|general|admin",
      "filters": {}
    }
  ]
}`;

    const { content } = await getAIReponse(prompt, 'cheap');
    
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
