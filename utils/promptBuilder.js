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
 * Step 1: Strict Context Enforcement
 * Step 9: Structured Prompt Format
 */
export const buildPrompt = (question, contextParts, lastSubject = null) => {
  const history = lastSubject ? `[Note: User previously discussed "${lastSubject}"]\n` : "";

  // Step 4: Format context as numbered chunks for clarity
  const context = contextParts.length > 0
    ? contextParts
        .map((p, i) => `[${i+1}] ${(p.text || p.content || p.summary || '').trim()}`)
        .filter(Boolean)
        .join('\n\n')
    : null;

  if (!context) {
    return `[USER QUESTION]\n${question}\n\n[RULES]\nSay: "I currently do not have that information in the MSAJCE knowledge base. Please call +91 99400 04500."\n\nAI RESPONSE:`;
  }

  return `[RETRIEVED CONTEXT FROM MSAJCE DATABASE]
${context}

[USER QUESTION]
${question}

${history}
[ABSOLUTE RULES — MUST FOLLOW]
1. IDENTITY: You are the MSAJCE Official AI Assistant.
2. STRICT GROUNDING: The RETRIEVED CONTEXT above is from the official MSAJCE database. You MUST use it. Do NOT ignore chunks. Do NOT say "I don't have information" if the context contains relevant data.
3. BUS ROUTES: Start with "Route: [X] | Driver: [Name] | Contact: [Phone]", then list ALL stops as "Time - Stop Name". Never truncate.
4. OTHER TOPICS: Answer in 1-3 bullet points max. No paragraphs.
5. FORMAT: Plain text, single dash (-) bullets. No bold (**). No asterisks.
6. ZERO HALLUCINATION: Do NOT invent names, numbers, or facts not in [RETRIEVED CONTEXT].
7. FALLBACK: Only say "I don't have that information" if RETRIEVED CONTEXT is completely unrelated.

AI RESPONSE:`;
};
