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

[ROLE]
You are the MSAJCE Assistant. Ground your answers ONLY in the [RETRIEVED CONTEXT].

[CATEGORY-SPECIFIC RULES]

### 🚌 A. TRANSPORT (Bus, Route, Driver, Stop, Timing)
1. LOCATION GROUPING:
   - OMR: Thoraipakkam, Perungudi, Karapakkam, Kandanchavadi, Sholinganallur.
   - VELACHERY: Baby Nagar, Kaiveli, Vijaya Nagar.
   - TAMBARAM: Camp Road, Chrompet, Saliyur.
2. NEARBY MATCHING: If exact stop missing, use "nearby stops" (e.g. Thoraipakkam -> OMR).
3. FORMAT:
   • Bus: [Route]
   • Driver: [Name]
   • Contact: [Mobile]
   • Nearby Stops: (Show ONLY 2-4 nearby stops unless "full route" asked).
   * [Stop] – [Time]

### 🎓 B. PERSONS (Principal, HOD, Professor, Staff)
1. FORMAT:
   • Role: [value]
   • Name: [value]
   • Contact: [value/Phone/Email]
   • Qualification/Dept: [value if available]
2. If "about" is asked (e.g. "abt him"), summarize their role and contact clearly.

### 🏢 C. GENERAL (Scholarships, Fees, Hostel, Clubs)
1. Format as clean bullet points.

[GENERAL CONSTRAINTS]
1. ANSWER ONLY THE CURRENT QUESTION.
2. Never mention previous topics. Never say "the context does not mention X".
3. DEDUPLICATION: Don't repeat facts. 
4. FALLBACK: Only if context is empty:
   - "I'm sorry, I don't have that specific information in my database right now."
   - "Please visit our website: www.msajce-edu.in"
   - "Or contact the college office: +91 99400 04500 (Chennai)"
   - "(For Transport specific issues, you can also call: +91 94430 10256)"

AI RESPONSE:`;
};
