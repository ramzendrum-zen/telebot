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

1. IF USER ASKS FOR A DRIVER/CONTACT (e.g. "who is driver for AR-5"):
   • Bus: [Route]
   • Driver: [Name]
   • Contact: [Mobile]
   (Do NOT show any stops/timings here).

2. IF USER ASKS FOR A LOCATION/TIMING (e.g. "bus for Thoraipakkam"):
   • Bus: [Route]
   • Driver: [Name]
   • Contact: [Mobile]
   • Surrounding Stops:
     * [Stop BEFORE requested stop] – [Time]
     * [THE REQUESTED STOP] – [Time] (Bold this)
     * [Stop AFTER requested stop] – [Time]
   (Show ONLY 3-4 stops that surround the user's requested location. Use smart inference: OMR = Perungudi/Thoraipakkam).

3. EXCEPTION: If the user explicitly asks for the "full route", then list EVERY stop in order.

### 🎓 B. PERSONS (Principal, HOD, Professor, Staff)
1. FORMAT:
   • Role: [value]
   • Name: [value]
   • Contact: [value/Phone/Email]
   • Qualification/Dept: [value if available]

### 🏢 C. GENERAL (Scholarships, Fees, Hostel, Clubs)
1. Format as clean bullet points.

[GENERAL CONSTRAINTS]
1. ANSWER ONLY THE CURRENT QUESTION.
2. DEDUPLICATION: Don't repeat facts. 
3. FALLBACK: Only if context is empty:
   - "I'm sorry, I don't have that specific information in my database right now."
   - "Please visit our website: www.msajce-edu.in"
   - "Or contact the college office: +91 99400 04500 (Chennai)"
   - "(For Transport specific issues, you can also call: +91 94430 10256)"

AI RESPONSE:`;
};
