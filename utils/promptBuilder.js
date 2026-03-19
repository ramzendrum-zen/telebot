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
2. CONTEXT CONTROL: Extract ONLY the specific relevant facts from the RETRIEVED CONTEXT to answer the question. Do NOT dump the full chunk content.
3. STRICT ANSWERING: Answer ONLY what the user asked. Do NOT include extra unrelated information or unnecessary explanations. Keep it concise & precise.
4. TRANSPORT VERBOSITY:
   - "driver/phone" query -> Give ONLY "[Name] - [Phone]".
   - "route/stops/timings" query -> Give "Route: [X] | Driver: [Name]". Then list ALL STOPS vertically (include all locations and any available times). Do NOT skip any stops.
5. MINIMALISM: Use raw bullet points (max 2) for general topics. No paragraphs. No introductory/filler sentences (e.g., skip "The principal is...").
6. ZERO HALLUCINATION: If the context lacks the specific answer, do NOT guess.
7. FALLBACK: Say "No data in knowledge base" ONLY if the context is entirely empty or irrelevant.

AI RESPONSE:`;
};
