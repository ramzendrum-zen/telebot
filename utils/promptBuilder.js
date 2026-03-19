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
2. ZERO-HALLUCINATION: If specific data is NOT in the [CONTEXT PROVIDER] blocks above, say you do not have that detail.
3. CONCISENESS: 
   - FOR BUS ROUTES/TIMINGS: ALWAYS start with: "Route: [Route Number] | Driver: [Driver Name] | Contact: [Phone]". Then list ALL stops one per line as "Time - Stop Name". Never skip stops.
   - FOR ALL OTHER TOPICS: Answer in exactly 1-2 brief bullet points. NO paragraphs.
4. FORMAT: Use plain text with single dashes (-) for bullets. No double asterisks (**). No bolding.
5. NO FLUFF: Only give the needed answer. No "I hope this helps" or "Safe travels".

${history}
AI RESPONSE:`;
};
