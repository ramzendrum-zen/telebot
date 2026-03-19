import logger from '../utils/logger.js';
import { getAIReponse } from './aiService.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `You are the MSAJCE Query Intent Resolver. Your job is to understand ANY user query — even with typos, slang, missing words, or broken grammar — and convert it into a clean, searchable query.

MSAJCE KNOWLEDGE DOMAIN (all data types you must understand):
- TRANSPORT: Bus routes (AR-1 to AR-30, R-22 etc.), drivers, stops, timings, transport office contact
- FACULTY: HOD, professors, staff by department (CSE, IT, ECE, EEE, Mech, Civil, AI/ML, CyberSec)
- ADMIN: Principal, Vice Principal, college address, phone, email, campus facts
- SCHOLARSHIPS: Pragati, Saksham, Merit-cum-Means, Central Sector, minority scholarships, girl student schemes
- HOSTEL: Warden, fees, rules, facilities, ladies hostel
- CLUBS & EVENTS: CSI, IEEE, NSS, YRC, sports, cultural events, symposium
- FEES: Tuition fees, hostel fees, exam fees by department
- DEPARTMENTS: Info about each department, labs, facilities
- PLACEMENTS: Companies, salary packages, placement statistics

RULES:
1. Fix ALL typos: "drver" → "driver", "phn" → "phone", "fr" → "for", "abt" → "about", "contct" → "contact"
2. Expand short forms: "ar8" → "AR-8", "ar 5" → "AR-5", "r22" → "R-22", "cse" → "CSE", "it" → "Information Technology", "hod" → "HOD"
3. Even if grammar is broken, extract the intent. "raju contact" → "What is the contact number of driver Raju?"
4. "contact velu", "how to reach velu", "velu number" → transport query about driver Velu
5. "girl scholarship", "scholarship fr girls" → scholarship query for girl students
6. CATEGORY RULES:
   - Bus, route, driver, stop, timing, AR-X, R-XX → "transport"
   - Professor, HOD, faculty, staff, department → "faculty"
   - Principal, vice principal, admin, address, campus → "admin"
   - Scholarship, stipend, financial aid → "general"
   - Hostel, warden, accommodation → "general"
   - Clubs, events, IEEE, CSI, NSS → "general"
   - Fees, tuition → "general"

User Query: "${query}"

Output EXACT JSON only (no markdown, no explanation):
{
  "subject": "Primary entity name (e.g. AR-8, Mr. Raju, Principal, Yogesh)",
  "queries": [
    {
      "query": "Clean, complete, grammatically correct question",
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
        
        logger.info(`Intent resolved: "${query}" → ${JSON.stringify(queries)}`);
        
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
