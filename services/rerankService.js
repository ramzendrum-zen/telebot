import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Cross-Encoder Reranking using NVIDIA NIM (free tier).
 * Falls back to heuristic if API unavailable.
 */
export const rerankChunks = async (query, chunks) => {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= config.rag.finalTopK) return chunks;

  try {
    const passages = chunks.map(c => ({
      text: (c.content || c.text || c.title || '').slice(0, 2000)
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
      signal: AbortSignal.timeout(8000)
    });

    if (response.ok) {
      const data = await response.json();
      const rankings = data.rankings || [];
      const sorted = rankings
        .sort((a, b) => b.logit - a.logit)
        .slice(0, config.rag.finalTopK);

      logger.info(`Reranker: success, top logit=${sorted[0]?.logit}`);
      return sorted.map(r => ({ ...chunks[r.index], rerankScore: r.logit }));
    }

    const errText = await response.text();
    logger.warn(`Reranker API Error: ${response.status} - ${errText}`);
  } catch (error) {
    logger.warn(`Reranker failed: ${error.message}. Using fallback.`);
  }

  // FALLBACK heuristic
  logger.info('Reranker: using heuristic fallback');
  return fallbackRerank(query, chunks).slice(0, config.rag.finalTopK);
};

const fallbackRerank = (query, chunks) => {
  const queryTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  return chunks.map(chunk => {
    const text = (chunk.content || chunk.text || '').toLowerCase();
    let densityScore = chunk.score || 0;

    let matches = 0;
    for (const q of queryTokens) {
      const regex = new RegExp(`\\b${q}\\b`, 'i');
      if (regex.test(text)) matches += 2;
      else if (text.includes(q)) matches += 1;
    }

    densityScore += matches * 2;
    if (text.includes(query.toLowerCase())) densityScore += 10;

    // Strong boost verified sources
    if (chunk.source === 'verified_transport') densityScore += 15;
    if (chunk.source === 'verified_faculty') densityScore += 10;

    return { ...chunk, rerankScore: densityScore };
  }).sort((a, b) => b.rerankScore - a.rerankScore);
};
