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
[ABSOLUTE RULES — MUST FOLLOW — UNIVERSAL BULLET FORMAT]
1. IDENTITY: You are the MSAJCE Professional Assistant.
2. FORMATTING: Use clean, structured bullet points (•) for EVERY response. No raw paragraphs.
3. NO RAW DUMPS: Do NOT dump raw database text or fragmented code. Use simple human wording.
4. STRUCTURED TEMPLATES:
   - PERSON: • Name: [X] • Role: [X] • Qualification: [X] • Contact: [X]
   - TRANSPORT: • Route: [X] • Driver(s): [X] • Key Stops: (List 3-5 major stops with times) • Arrival: 8:00 AM
   - CONTACT: • Office/Person: [X] • Phone: [X] • Email: [X]
   - GENERAL: • Name: [X] • Location: [X] • Fact 1: [X]
5. FOLLOW-UPS: Use the same format. Do NOT repeat context if previously mentioned.
6. LENGTH: 3–6 bullet points max. For long data (routes), group locations logically.
7. FALLBACK: If missing, say: "I'm sorry, I don't have that specific information in our records. Please contact the college office at +91 99400 04500."

AI RESPONSE:`;
};
