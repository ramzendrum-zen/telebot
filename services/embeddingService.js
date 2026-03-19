import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Standardized embedding service using OpenRouter openai/text-embedding-3-small.
 * Configured for 1536 dimensions as requested.
 */
export const generateEmbedding = async (text, inputType = 'passage') => {
  try {
    if (!text || text.trim().length === 0) return new Array(1536).fill(0);

    const response = await fetch('https://openapi.openrouter.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.openRouter.embeddingModel,
        input: text.replace(/\n/g, ' ')
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Embedding Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data && data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding;
    }

    throw new Error('Invalid response structure from OpenRouter Embedding API');
  } catch (error) {
    logger.error(`Embedding Service Error: ${error.message}`);
    // Fallback to zero-vector to prevent pipeline crash
    return new Array(1536).fill(0);
  }
};
