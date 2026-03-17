import { getAIReponse } from './aiService.js';
import logger from '../utils/logger.js';

/**
 * Recursive Character Splitting Logic for Small RAG (Facts & Dates)
 * Target: 250-400 chars. No mid-sentence splits.
 */
export const splitContent = (text, chunkSize = 325, overlapSize = 60) => {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        if (end > text.length) end = text.length;

        // Boundary Logic: Avoid splitting sentences. 
        if (end < text.length) {
            const findLast = (str, chars, maxSearch) => {
                for (let i = 0; i < maxSearch; i++) {
                    if (chars.includes(str[end - i])) return end - i + 1;
                }
                return end;
            };
            end = findLast(text, ['.', '\n', '!', '?'], 150);
        }

        chunks.push(text.slice(start, end).trim());
        const nextStart = end - overlapSize;
        // Safety: Ensure we always move forward
        if (nextStart <= start) {
            start = end;
        } else {
            start = nextStart;
        }
        if (start >= text.length) break;
    }

    return chunks;
};

/**
 * MASTER PROMPT: "Data Engineering Expert" for RAG Ingestion
 */
export const cleanAndEnrichChunk = async (chunkContent, metadata = {}) => {
    const prompt = `
        Role: You are a Data Engineering Expert specializing in RAG pipelines. 
        Task: Clean, normalize, and structure this data chunk for a 1536-dimension vector database.

        Input: "${chunkContent}"

        Step 1: Cleaning & Normalization
        * Remove Noise: Strip HTML, boilerplate, extra whitespace.
        * Fix Errors: Correct encoding and normalize punctuation.
        * Standardization: Professional academic tone.

        Step 2: Semantic Enrichment
        * Summary: 1-sentence description.
        * KEYWORDS: High-impact topics (comma-separated).
        * ENTITIES: Specific names, locations, dates (comma-separated).
        * QUERY_VARIATIONS: Generate 3 ways a student might ask for this specific info.

        Output JSON:
        {
          "content": "semantically dense cleaned string",
          "summary": "1-sentence summary",
          "keywords": ["key1", "key2"],
          "entities": ["entity1", "entity2"],
          "query_variations": ["var1", "var2", "var3"],
          "metadata": ${JSON.stringify(metadata)}
        }
    `;

    try {
        const raw = await getAIReponse(prompt, 'cheap');
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON matched in AI response");
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        logger.error(`Enrichment Error: ${error.message}`);
        return {
            content: chunkContent,
            summary: "",
            keywords: [],
            metadata
        };
    }
};

/**
 * Step 4 (Optional): Upsert to Pinecone
 * Placeholder for future activation if API keys are provided.
 */
export const upsertToPinecone = async (id, embedding, metadata) => {
    if (!process.env.PINECONE_API_KEY) return null;
    // Implementation would go here
    logger.info(`Pinecone Upsert: ${id}`);
    return true;
};
