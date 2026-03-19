import FAQCache from '../database/models/FAQCache.js';
import { generateEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export const checkSemanticCache = async (queryEmbedding) => {
  try {
    // Vector search against the FAQ collection
    const results = await FAQCache.aggregate([
      {
        "$vectorSearch": {
          "index": "faq_vector_index", // Requires an index configured on this collection
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 50,
          "limit": 1
        }
      },
      {
        "$project": {
          "answer": 1,
          "normalized_question": 1,
          "usage_count": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ]).toArray();

    if (results.length > 0 && results[0].score >= config.rag.faqSimilarityThreshold) {
      // Hit! Update usage count
      await FAQCache.updateOne(
        { _id: results[0]._id },
        { $inc: { usage_count: 1 }, $set: { updated_at: new Date() } }
      );
      logger.info(`Semantic Cache HIT: Score ${results[0].score} for "${results[0].normalized_question}"`);
      return results[0].answer;
    }
    return null;

  } catch (err) {
    logger.warn(`Semantic Cache Check Error: ${err.message}`);
    return null;
  }
};

export const storeInSemanticCache = async (normalizedQuery, embedding, answer) => {
  try {
    const existing = await FAQCache.findOne({ normalized_question: normalizedQuery });
    if (!existing) {
      const doc = new FAQCache({
        normalized_question: normalizedQuery,
        embedding,
        answer
      });
      await doc.save();
      logger.info(`Stored new query in Semantic FAQ Cache: "${normalizedQuery}"`);
      // We could trigger variation generation asynchronously here
      generateVariations(normalizedQuery, answer).catch(e => logger.warn(`Variation gen error: ${e.message}`));
    }
  } catch (err) {
    logger.warn(`Failed to store semantic cache: ${err.message}`);
  }
};

import { getAIReponse } from './aiService.js';

async function generateVariations(canonical, answer) {
    const prompt = `Generate 3 completely different variations of this question that a student might ask.
Only output the variations, one per line. No numbers.
Question: "${canonical}"`;
    
    try {
        const text = await getAIReponse(prompt, 'cheap');
        const vars = text.split('\n').map(v => v.trim()).filter(v => v.length > 5).slice(0, 3);
        
        for (let v of vars) {
            if (v.toLowerCase() !== canonical.toLowerCase()) {
                const emb = await generateEmbedding(v);
                if (emb) {
                    const vDoc = new FAQCache({ normalized_question: v, embedding: emb, answer });
                    await vDoc.save().catch(()=>null);
                }
            }
        }
    } catch (e) {
        logger.warn(`Variation gen failed: ${e.message}`);
    }
}
