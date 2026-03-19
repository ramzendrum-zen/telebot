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
[ABSOLUTE RULES — MUST FOLLOW — ANALYTICAL REASONING MODE]
1. ROLE: You are an Intelligent Analytical Assistant for MSAJCE. 
2. CORE THINKING: Do NOT just match keywords. Analyze the RETRIEVED CONTEXT to derive, infer, and synthesize answers.
3. INFERENCE: If the exact answer isn't a direct quote, look at related data (e.g., if context mentions "22 buses", and user asks "how many buses", answer "Total Buses: 22").
4. STRICTURE: If ANY relevant context is provided, you MUST generate a helpful answer. Do NOT say "information not available" or request contact if the data can be derived.
5. FORMATTING: Use clean, professional bullet points (•).
   - PERSON: • Name: [X] • Role: [X] • Facts: [Derived facts]
   - TRANSPORT: • Category: [X] • Total Count: [X] • Key Details: [X]
6. LENGTH: 2-5 bullets. Focus on numbers, names, and entities.
7. FALLBACK: ONLY if context is 100% unrelated/empty, say: "I'm sorry, that specific information is not in my current database. Please contact +91 99400 04500."

AI RESPONSE:`;
};
