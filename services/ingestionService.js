import { getAIReponse } from './aiService.js';
import logger from '../utils/logger.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * PROJECT PHOENIX: HIGH-PRECISION INGESTION ENGINE
 * 
 * Objectives:
 * 1. Semantic Cleaning (Boilerplate removal)
 * 2. Deep Entity Extraction (People, Roles, Depts)
 * 3. 1536-Dimension Vectorization
 */

export const processRawData = async (text, source = 'admin_upload', category = 'general') => {
    logger.info(`Phoenix Ingestion: Processing block from ${source}`);

    // Step 1: Cleaning and Enrichment
    const enrichmentPrompt = `
        Role: Senior Data Scientist at MSAJCE. 
        Task: Clean and structure this knowledge chunk for a production-grade RAG system.

        Input Text: "${text}"

        STRICT RULES:
        1. Clean all noise (headers, IDs, weird formatting).
        2. Identify ALL specific entities (People Names, Department Names, Roles).
        3. Determine the most accurate category (transport | admission | departments | staff | student | extracurricular | infrastructure).

        Output JSON:
        {
          "clean_text": "polishes, dense factual content",
          "subject_name": "Full name of main person if mentioned",
          "subject_role": "Their precise role",
          "department": "Main department involved",
          "category": "suggested category",
          "tags": ["extracted", "keywords"]
        }
    `;

    try {
        const aiResponse = await getAIReponse(enrichmentPrompt, 'cheap');
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Inconsistent AI Response format");
        
        const data = JSON.parse(jsonMatch[0]);

        // Step 2: Vectorization
        const embedding = await generateEmbedding(data.clean_text, 'document');

        return {
            content: data.clean_text,
            category: data.category || category,
            metadata: {
                name: data.subject_name || null,
                role: data.subject_role || null,
                department: data.department || null,
                tags: data.tags || [],
                source: source,
                ingested_at: new Date()
            },
            embedding: embedding,
            is_phoenix: true
        };
    } catch (e) {
        logger.error(`Phoenix Ingestion Failure: ${e.message}`);
        return null;
    }
};
