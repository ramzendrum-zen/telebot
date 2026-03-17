import { getAIReponse } from './aiService.js';
import logger from '../utils/logger.js';

/**
 * Recursive Character Splitting Logic
 * Logic: Split by double newlines, then single, then periods, then whitespace.
 */
export const splitContent = (text, chunkSize = 2400, overlapSize = 250) => {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        if (end > text.length) end = text.length;

        // Boundary Logic: Avoid splitting sentences. Look for period or newline.
        if (end < text.length) {
            const findLast = (str, chars, maxSearch) => {
                for (let i = 0; i < maxSearch; i++) {
                    if (chars.includes(str[end - i])) return end - i + 1;
                }
                return end;
            };
            end = findLast(text, ['.', '\n', '!', '?'], 500);
        }

        chunks.push(text.slice(start, end).trim());
        start = end - overlapSize;
        if (start < 0) start = 0;
        if (start >= text.length) break;
    }

    return chunks;
};

/**
 * Master Prompt Step 1 & 3: Clean, Normalize, and Enrich
 */
export const cleanAndEnrichChunk = async (chunkContent, metadata = {}) => {
    const prompt = `
        Role: You are a Data Engineering Expert specializing in RAG pipelines.
        Task: Clean, normalize, and structure this data chunk for a 3072-dimension vector database.

        CHUNK CONTENT:
        "${chunkContent}"

        Step 1: Cleaning & Normalization
        * Remove Noise: Strip boilerplate (headers/footers) and excessive whitespace.
        * Fix Errors: Correct encoding and normalize characters.
        * Standardization: Consistent professional tone.

        Step 3: Enrichment & Metadata
        * Summary: Generate a 1-sentence summary for this chunk.
        * Keywords: Extract exactly 5 key entities or topics.
        * Semantic Restructuring: Preserve high semantic density in the content description.

        Output EXACT JSON:
        {
          "content": "Fully cleaned and semantically enriched content string",
          "summary": "The 1-sentence summary",
          "keywords": ["key1", "key2", "key3", "key4", "key5"],
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
