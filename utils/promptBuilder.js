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
export const buildPrompt = (question, contextParts) => {
  // Step 4: Format context as numbered chunks for clarity
  const context = contextParts.length > 0
    ? contextParts
        .map((p, i) => `[${i+1}] ${(p.text || p.content || p.summary || '').trim()}`)
        .filter(Boolean)
        .join('\n\n')
    : null;

  if (!context) {
    return `[USER QUESTION]\n${question}\n\n[RULES]\nSay: "I'm sorry, I don't have that specific information in my database right now. Please contact the college directly at +91 99400 04500."\n\nAI RESPONSE:`;
  }

  return `[RETRIEVED CONTEXT FROM MSAJCE DATABASE]
${context}

[USER QUESTION]
${question}

[STRICT FORMAT RULES — NO EXCEPTIONS]
1. You are MSAJCE Assistant. Answer ONLY from [RETRIEVED CONTEXT].
2. EVERY piece of information = ONE bullet point. One line. No paragraphs. No long sentences.
3. BANNED: Long sentences. Sub-bullets. "NOTE:" sections. "ADDITIONAL:" sections. Explanations. Reasoning text.
4. FOR PERSONS: Exactly these bullets only (skip if not in context):
   • Name: [value]
   • Role: [value]
   • Contact: [value]
   • Qualification: [value]
5. FOR BUS ROUTES: Exactly these bullets only:
   • Route: [value]
   • Driver: [value]
   • Stop 1: [Stop Name] – [Time]
   • Stop 2: [Stop Name] – [Time]
   ... (one stop per bullet)
   • Arrival: 8:00 AM
6. FOR GENERAL FACTS: One short bullet per fact. Max 8 words per bullet.
7. FALLBACK: If not in context: "• Info not available. Contact: +91 99400 04500"
8. MAX LENGTH: 8 bullet points total. Cut the rest.

AI RESPONSE:`;
};
