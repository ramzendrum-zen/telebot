import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Generates embeddings using NVIDIA NIM's nv-embedqa-e5-v5 model (free tier).
 * NVIDIA NIM uses an OpenAI-compatible API with an extra `input_type` param.
 * @param {string} text - The text to embed.
 * @param {'query'|'passage'} inputType - Use 'query' for searches, 'passage' for documents.
 */
export const generateEmbedding = async (text, inputType = 'passage') => {
  try {
    const response = await fetch(`${config.nvidia.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.nvidia.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.nvidia.models.embedding,
        input: [text.replace(/\n/g, ' ')],
        input_type: inputType,
        encoding_format: 'float',
        truncate: 'END'
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`NVIDIA Embedding API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (data && data.data && data.data[0]) {
      return data.data[0].embedding;
    } else {
      throw new Error('Invalid embedding response format from NVIDIA NIM');
    }
  } catch (error) {
    logger.error(`Embedding Service Error: ${error.message}`);
    throw error;
  }
};
