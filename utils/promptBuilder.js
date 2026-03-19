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
2. STRICT GROUNDING: Use the RETRIEVED CONTEXT official database. Do NOT ignore it. 
3. TRANSPORT FILTRATION:
   - If question is about "driver", "phone", or "contact": Give ONLY the driver name and phone. Do NOT list route stops.
   - If question is about "route", "stops", "full list", or "timings": List the Route/Driver header AND all stops as "Time - Stop Name" (vertical bullets).
4. OTHER TOPICS: Answer in 1-2 bullet points max. NEVER give paragraphs.
5. FORMAT: Plain text only. Use dash (-) for bullets. No bold (**). No symbols like "****".
6. NEEDED-ONLY: Do NOT add safe travel tips or generic help text. Only give the specific answer asked.
7. FALLBACK: Only say "I don't have that information" if RETRIEVED CONTEXT is empty.

AI RESPONSE:`;
};
