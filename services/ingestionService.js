import { getAIReponse } from './aiService.js';
import logger from '../utils/logger.js';

import { buildSemanticChunkingPrompt } from '../utils/promptBuilder.js';

/**
 * Intelligent Semantic Chunking Logic for RAG
 * Splits content into meaningful, complete ideas rather than random char limits.
 */
export const splitContent = async (text) => {
    const prompt = buildSemanticChunkingPrompt(text);
    
    try {
        const response = await getAIReponse(prompt, 'cheap');
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) throw new Error("No JSON array returned for Semantic Chunking");
        
        const semanticChunks = JSON.parse(jsonMatch[0]);
        // Map back to array of strings for downstream compatibility, 
        // or return objects if downstream supports it. Let's return strings.
        return semanticChunks.map(chunk => `[${chunk.title}] ${chunk.content}`);
    } catch (error) {
        logger.error(`Semantic Chunking Error: ${error.message}`);
        // Fallback to basic regex splitting
        return text.split(/\n\n+/).filter(b => b.trim().length > 50);
    }
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
