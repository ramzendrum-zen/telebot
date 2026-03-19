import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Cross-Encoder Reranking using NVIDIA NIM nv-rerank-qa-mistral-4b:1 (free tier).
 * Uses a dedicated API key separate from the main AI/embedding key.
 */
export const rerankChunks = async (query, chunks) => {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= config.rag.finalTopK) return chunks;

  try {
    // NVIDIA Reranker payload format:
    // { model, query: { text }, passages: [{ text }] }
    const passages = chunks.map(c => ({
      text: (c.content || c.text || c.title || '').slice(0, 2000) // Truncate to stay within limits
    }));

    const response = await fetch(`${config.nvidia.baseUrl}/ranking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.nvidia.rerankerApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.nvidia.models.reranker,
        query: { text: query },
        passages
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      // Response: { rankings: [{ index: number, logit: number }] }
      const rankings = data.rankings || [];
      const sorted = rankings
        .sort((a, b) => b.logit - a.logit)
        .slice(0, config.rag.finalTopK);

      return sorted.map(r => ({ ...chunks[r.index], rerankScore: r.logit }));
    }

    const errText = await response.text();
    logger.warn(`NVIDIA Reranker API Error: ${response.status} - ${errText}`);
  } catch (error) {
    logger.warn(`Reranker failed: ${error.message}. Falling back to heuristic.`);
  }

  // FALLBACK: heuristic scoring if NVIDIA API call fails
  logger.info('Using Fallback Reranking Heuristic');
  return fallbackRerank(query, chunks).slice(0, config.rag.finalTopK);
};

const fallbackRerank = (query, chunks) => {
  const queryTokens = query.toLowerCase().split(' ').filter(w => w.length > 3);

  return chunks.map(chunk => {
    const text = (chunk.content || chunk.text || '').toLowerCase();
    let densityScore = chunk.score || 0;

    let matches = 0;
    for (const q of queryTokens) {
      if (text.includes(q)) matches++;
    }

    densityScore += matches * 2;
    if (text.includes(query.toLowerCase())) densityScore += 10;

    return { ...chunk, rerankScore: densityScore };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
};
