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

    const systemMsg = `You are the Official AI Academic Assistant for Mohamed Sathak A J College of Engineering (MSAJCE). 
Strict Grounding Rule: You MUST only answer from the provided [CONTEXT].
If the answer is NOT in [CONTEXT], say: "I currently do not have that specific information in the MSAJCE knowledge base."
Never hallucinate or invent names (e.g., Suresh Kumar, Raju, etc. unless explicitly in context).
Stay professional and concise.`;

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
    await pushLog('assistant', 'error', `AI Generation Failed`, { error: error.message }).catch(()=>null);
    throw error;
  }
};
