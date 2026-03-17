import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Cross-Encoder Reranking
 * Leverages bge-reranker-large to score query+chunk pairs.
 */
export const rerankChunks = async (query, chunks) => {
  if (!chunks || chunks.length === 0) return [];
  if (chunks.length <= config.rag.finalTopK) return chunks; // No need to rerank if less than 5

  try {
    // 1. Format payload for HuggingFace Inference API or custom reranking endpoint
    // Standard Cross-Encoder payload: {"inputs": {"source_sentence": query, "sentences": [...chunks]}}
    // Since HF API doesn't guarantee uptime without pro, we use a hybrid heuristic fallback if it fails.
    
    // As per user architectural request: "Model: bge-reranker-large"
    // Using Hosted API endpoint (assumes HuggingFace token or proxy in env)
    const token = process.env.HF_TOKEN; 
    
    if (token) {
        const payload = {
            inputs: {
                source_sentence: query,
                sentences: chunks.map(c => c.content || c.text || c.title)
            }
        };

        const response = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-reranker-large', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            const scores = await response.json();
            // scores is typically an array of numbers mapping 1:1 to sentences
            const scoredChunks = chunks.map((c, i) => ({
                ...c,
                rerankScore: scores[i] || 0
            }));
            
            return scoredChunks
                .sort((a, b) => b.rerankScore - a.rerankScore)
                .slice(0, config.rag.finalTopK);
        }
    }

    // 2. FALLBACK RERANKER (Lexical/Semantic Density Scoring)
    // If no token or API fails, rely on the strong hybrid scores we already computed,
    // but apply an exact-match density boost.
    logger.info("Using Fallback Reranking Heuristic");
    return fallbackRerank(query, chunks).slice(0, config.rag.finalTopK);

  } catch (error) {
    logger.warn(`Reranker failed: ${error.message}. Returning baseline topK.`);
    return chunks.slice(0, config.rag.finalTopK);
  }
};

const fallbackRerank = (query, chunks) => {
    const queryTokens = query.toLowerCase().split(' ').filter(w => w.length > 3);
    
    return chunks.map(chunk => {
        const text = (chunk.content || chunk.text || '').toLowerCase();
        let densityScore = chunk.score || 0; // Baseline hybrid score
        
        // Boost for dense proximity of keywords
        let matches = 0;
        for (let q of queryTokens) {
            if (text.includes(q)) matches++;
        }
        
        densityScore += (matches * 2);
        
        // Exact substring match boost
        if (text.includes(query.toLowerCase())) densityScore += 10;
        
        return { ...chunk, rerankScore: densityScore };
    }).sort((a, b) => b.rerankScore - a.rerankScore);
};
