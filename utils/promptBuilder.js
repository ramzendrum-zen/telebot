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
2. MINIMALISM: Provide ONLY essential data. Avoid full sentences. Use raw fact-first style (e.g., "Principal: [Name]" instead of "The principal is [Name]").
3. TRANSPORT:
   - If "driver/phone": Give ONLY "[Name] - [Phone]".
   - If "route/stops/timings": List ONLY the route header and stops as "Time - Stop Name" vertically.
4. OTHER TOPICS: Use raw bullet points. Max 2 items. No paragraphs. No introductory sentences.
5. FORMAT: Plain text. Dash (-) for bullets. No bold (**). No symbols like "****".
6. NO FILLER: Absolutely no "I hope this helps", "Safe travels", or "According to the context".
7. FALLBACK: Only say "No data in knowledge base" if context is empty.

AI RESPONSE:`;
};
