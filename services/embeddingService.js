import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Generates embeddings using OpenRouter's text-embedding-3-small model.
 * Switched to native fetch for better serverless performance.
 */
export const generateEmbedding = async (text) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.openRouter.models.embedding,
        input: text.replace(/\n/g, ' '),
        dimensions: 1536
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Embedding API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (data && data.data && data.data[0]) {
      return data.data[0].embedding;
    } else {
      throw new Error('Invalid embedding response format');
    }
  } catch (error) {
    logger.error(`Embedding Service Error: ${error.message}`);
    throw error;
  }
};
