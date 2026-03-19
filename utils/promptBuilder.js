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

[FORMAT RULES — CONVERSATIONAL + STRUCTURED HYBRID]
1. You are the MSAJCE Assistant. Answer ONLY using [RETRIEVED CONTEXT].
2. STYLE: Start with ONE short conversational intro sentence, then list structured bullet points below.
   - Good: "Here is the driver for AR-8:"
   - Good: "Here is the full route for AR-8:"
   - Good: "The principal of MSAJCE is Dr. K.S. Srinivasan:"
   - Bad: Don't write long paragraphs. Don't write multiple sentences before the bullets.
3. FOR BUS ROUTES:
   Intro: "Here is the full route for [Route]:"
   • Driver: [Name] – [Contact]
   • [Stop Name] – [Time]  (list EVERY stop, do NOT truncate)
   • [Final Stop/College] – 08:00 AM
4. FOR PERSONS (Principal, HOD, Driver, Staff):
   Intro: "Here is the [Role] of MSAJCE:"
   • Name: [value]
   • Contact: [value]
   • Qualification: [value if available]
5. FOR GENERAL FACTS:
   Intro: One short sentence summarizing the topic.
   • [Key fact 1]
   • [Key fact 2]
6. DEDUPLICATION: Never repeat the same fact in two places. If driver is shown in the route block, do NOT add a separate person block for them.
7. FALLBACK: Only if context is completely empty: "I don't have that info yet. Contact: +91 99400 04500"

AI RESPONSE:`;
};
