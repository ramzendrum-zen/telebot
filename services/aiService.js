import config from '../config/config.js';
import logger from '../utils/logger.js';

/**
 * Handles AI orchestration using NVIDIA NIM free-tier models.
 * NVIDIA NIM uses an OpenAI-compatible API endpoint.
 */
export const getAIReponse = async (prompt, modelType = 'cheap') => {
  try {
    const model = modelType === 'advanced'
      ? config.nvidia.models.advanced
      : config.nvidia.models.cheap;

    const response = await fetch(`${config.nvidia.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.nvidia.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024,
        stream: false
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }

    throw new Error('Invalid response structure from NVIDIA NIM');
  } catch (error) {
    logger.error(`AI Service Error: ${error.message}`);
    throw error;
  }
};
