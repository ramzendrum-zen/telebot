import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Standardized embedding service using Google Gemini text-embedding-004.
 * Set to 1536 dimensions to match existing Atlas vector index.
 */
export const generateEmbedding = async (text, inputType = 'passage') => {
  try {
    if (!text || text.trim().length === 0) return new Array(1536).fill(0);

    // Gemini AI Studio Endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.embeddingModel}:embedContent?key=${config.gemini.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text: text.replace(/\n/g, ' ') }]
        },
        task_type: inputType === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        output_dimensionality: 1536 // EXPLICIT DIMENSION SETTING for 1536-dim index
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Embedding Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data && data.embedding && data.embedding.values) {
      return data.embedding.values;
    }

    throw new Error('Invalid response structure from Gemini Embedding API');
  } catch (error) {
    logger.error(`Embedding Service Error: ${error.message}`);
    // Fallback to zero-vector to prevent pipeline crash if quota is hit
    return new Array(1536).fill(0);
  }
};
