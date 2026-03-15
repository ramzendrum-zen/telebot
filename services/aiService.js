const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Handles AI orchestration with model fallbacks.
 */
const getAIReponse = async (prompt, modelType = 'cheap') => {
  try {
    const model = modelType === 'advanced' 
      ? config.openRouter.models.advanced 
      : config.openRouter.models.cheap;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouter.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // Increased to 30 seconds
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('Invalid OpenRouter response');
  } catch (error) {
    logger.error(`AI Service Error: ${error.message}`);
    throw error;
  }
};

module.exports = { getAIReponse };
