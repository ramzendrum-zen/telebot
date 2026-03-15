import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Handles AI orchestration with model fallbacks using native fetch.
 */
export const getAIReponse = async (prompt, modelType = 'cheap') => {
  try {
    const model = modelType === 'advanced' 
      ? config.openRouter.models.advanced 
      : config.openRouter.models.cheap;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://msajce-bot.vercel.app', // Required by OpenRouter for ranking
        'X-Title': 'MSAJCE Assistant'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    
    throw new Error('Invalid response structure from OpenRouter');
  } catch (error) {
    logger.error(`AI Service Error: ${error.message}`);
    throw error;
  }
};
