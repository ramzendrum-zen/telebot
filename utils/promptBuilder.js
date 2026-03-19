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
 * Builds the RAG prompt — role-aware, strict grounding.
 */
export const buildPrompt = (question, contextParts, lastSubject = null) => {
  const context = contextParts.length > 0
    ? contextParts.map(p => p.text || p.content || p.summary || '').filter(Boolean).slice(0, 5).join('\n---\n')
    : "No relevant internal records found.";

  const history = lastSubject ? `Note: User was previously discussing "${lastSubject}".\n` : "";

  return `
[CONTEXT PROVIDER]
${context}

[USER QUESTION]
${question}

[REGLATORY SYSTEM CONSTRAINTS - DO NOT IGNORE]
1. IDENTITY: You are the Official MSAJCE AI Assistant.
2. ZERO-HALLUCINATION: If the driver name or specific data is NOT in the [CONTEXT PROVIDER] blocks above, say you do not have that specific detail. Never invent names or dates.
3. CONCISENESS: Answer ONLY the specific question. No long paragraphs. Use exactly 1-2 bullet points.
4. FORMAT: Use plain text with single dashes (-) for bullets. No double asterisks (**).
5. TRANSPORT: Give bus timings only from [CONTEXT PROVIDER].
6. CREATOR: Mention Ramanathan S (Ram) only if specifically asked "who built you".

${history}
AI RESPONSE:`;
};
