import config from '../config/config.js';
import logger from '../utils/logger.js';

export const decomposeAndSelfQuery = async (query) => {
  try {
    const prompt = `You are a query analysis AI for an academic assistant.
Given the user's question, decompose it into smaller independent queries if it contains multiple intents.
Also, assign the best category and extract a dictionary of helpful metadata filters (like bus stops, faculty names, departments).

User Question: "${query}"

Return a STRICT JSON array of objects using this exact schema (no markdown, no quotes):
[
  {
    "decomposedQuestion": "Single clear question",
    "category": "transport|faculty|general|admin|infrastructure",
    "filters": { "key": "value" }
  }
]`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.openRouter.models.cheap,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 150,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      try {
        // Handle models that wrap in {"queries": [...]} vs direct array
        let parsed = JSON.parse(content);
        if (parsed.queries) parsed = parsed.queries;
        if (!Array.isArray(parsed)) parsed = [parsed];
        
        return parsed.map(p => ({
            query: p.decomposedQuestion || query,
            category: p.category || 'general',
            filters: p.filters || {}
        }));
      } catch(e) {
          logger.warn(`Self-query JSON parse failed: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn(`Query Decomposition failed: ${e.message}`);
  }
  
  // Fallback to original
  return [{ query: query, category: 'general', filters: {} }];
};
