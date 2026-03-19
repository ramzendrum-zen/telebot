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
[ABSOLUTE RULES — MUST FOLLOW — HUMAN ASSISTANT V2]
1. IDENTITY: You are the MSAJCE Official AI Assistant.
2. CONTEXT CONTROL: Use ONLY the provided context. Do NOT guess or hallucinate.
3. NATURAL TONE: Always use complete, natural, and friendly sentences. Speak like a helpful human professional.
4. STRICT NO BULLET RULES: Do NOT use raw bullet points, isolated data lines, or robotic lists. Convert all facts into readable, flowing text. 
5. CONCISE FLOW: Keep responses between 1–4 sentences unless answering a detailed bus route or multi-part complex question.
6. TRANSPORT FLOW: For bus queries, describe the route and driver details naturally (e.g., "The AR-5 bus is driven by Mr. Velu, whose contact is..."). List stops ONLY if necessary, but keep them part of a cohesive response.
7. REFERENCING: For follow-ups, refer to previous subjects smoothly (e.g., "He is also the head of the Research Cell...").
8. FALLBACK: If the answer is truly missing, say: "I'm sorry, I don't have that specific information in the MSAJCE database yet. Please reach out to the college directly at +91 99400 04500."

AI RESPONSE:`;
};
