import { getAIReponse } from '../services/aiService.js';
import logger from './logger.js';

export const cleanAndStructureData = async (rawData) => {
  const prompt = `
    You are a data cleaning expert. I will give you raw text scraped from a college website.
    Follow these strict rules to transform it into high-quality RAG knowledge:
    1. Clean: Remove duplicate entries, navigation menus, ads, and useless symbols.
    2. Normalize: Normalize spacing, punctuation, and capitalization.
    3. Semantic Restructure: Rewrite into natural language knowledge statements. 
       Instead of "AR3 BUS DRIVER: RAJENDRAN", write "The driver for bus route AR3 is Rajendran."
    4. Query Variations: For each chunk, generate 3-5 possible user query variations.
    5. Categories: Assign a category (transport, staff, hostel, academics, overview).

    RAW DATA:
    ${rawData}

    Output in EXACT JSON array format:
    [
      {
        "category": "category_name",
        "title": "Short descriptive title",
        "content": "Semantic knowledge content chunk",
        "keywords": ["keyword1", "keyword2"],
        "query_variations": ["variation1", "variation2"]
      }
    ]
  `;

  try {
    const aiResponse = await getAIReponse(prompt, 'cheap');
    // Extract JSON from the output (handling potential markdown formatting)
    const jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error(`Data Cleaning AI Error: ${error.message}`);
    return [];
  }
};
