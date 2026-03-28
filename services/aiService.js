import fetch from 'node-fetch';
import config from '../config/config.js';
import { pushLog } from './monitorService.js';
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

    const systemMsg = `You are the Official MSAJCE Assistant. Provide highly accurate, professional, and helpful responses based ONLY on the provided context. Speak naturally like a knowledgeable college staff member.`;

    const response = await fetch(`${config.nvidia.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.nvidia.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA AI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      return { content, usage };
    }

    throw new Error('Invalid response structure from NVIDIA NIM');
  } catch (error) {
    logger.error(`AI Service Error: ${error.message}`);
    await pushLog('assistant', 'error', `AI Generation Failed`, { error: error.message }).catch(()=>null);
    throw error;
  }
};
