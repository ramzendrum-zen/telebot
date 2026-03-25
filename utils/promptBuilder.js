/**
 * Simple tokenizer/cleaner for queries.
 */
export const normalizeText = (text) => {
  const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with']);
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => !stopWords.has(word))
    .join(' ')
    .trim();
};

/**
 * Builds the RAG prompt with extreme strict grounding and response formatting rules.
 */
export const buildPrompt = (question, contextParts) => {
  const context = contextParts
    .map((p, i) => `[CHUNK ${i+1}] ${p.text || p.content || ''}`)
    .join('\n\n');

  return `You are a user-facing assistant for MSAJCE. Your job is to present ONLY the final answer clearly and cleanly.

========================
I. STRICT OUTPUT RULES (CRITICAL)
====================

1. DO NOT show any internal reasoning.
* Do NOT include: analysis, steps, thinking process, or explanations about how the answer was generated.

2. DO NOT mention:
* "context", "chunks", "retrieval", "database", "embedding", "analysis", "protocol", or "steps".

3. NEVER include phrases like:
* "Based on the provided context"
* "From chunk"
* "After analyzing"
* "According to data retrieved"

4. OUTPUT ONLY THE FINAL ANSWER.
* Use bullet points only.
* Keep it clean and readable.
* No headings unless necessary.
* No extra sections like "analysis" or "response generation".

5. REMOVE ALL INTERNAL LABELS
* Do not include any tags or reasoning block headers.

========================
II. DATA CONSTRAINTS
====================
* Use ONLY the information present in the below context.
* Do NOT assume missing details.
* If the context is insufficient, respond EXACTLY with: "I don't have enough information to answer that accurately."
* For numbers/dates, only answer if explicitly present. Do not estimate.

========================
FINAL OUTPUT
============
Return ONLY the clean answer in bullet points. Nothing else. Do NOT reveal your reasoning.

Context:
${context}

User Question:
${question}

Answer:`;
};
