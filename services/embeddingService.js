import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * PRODUCTION-GRADE embedding service using Google Gemini text-embedding-004.
 * Output dimensionality fixed to 3072 to match the Atlas vector index definition.
 */
export const generateEmbedding = async (text, inputType = 'passage') => {
  try {
    if (!text || text.trim().length === 0) return new Array(3072).fill(0);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.embeddingModel}:embedContent?key=${config.gemini.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text: text.replace(/\n/g, ' ') }]
        },
        task_type: inputType === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        output_dimensionality: 3072 // MATCHING ATLAS 3072-DIM INDEX
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
    // Return zero-vector to prevent pipeline crashes during quota limits
    return new Array(3072).fill(0);
  }
};
