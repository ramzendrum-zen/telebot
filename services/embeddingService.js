const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Generates embeddings using OpenRouter's text-embedding-3-small model.
 */
const generateEmbedding = async (text) => {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/embeddings',
      {
        model: config.openRouter.models.embedding,
        input: text.replace(/\n/g, ' ')
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout for embeddings
      }
    );

    if (response.data && response.data.data && response.data.data[0]) {
      return response.data.data[0].embedding;
    } else {
      throw new Error('Invalid embedding response from OpenRouter');
    }
  } catch (error) {
    logger.error(`Embedding Error: ${error.message}`, { data: error.response?.data });
    throw error;
  }
};

module.exports = { generateEmbedding };
