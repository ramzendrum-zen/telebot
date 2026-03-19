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
  const context = contextParts
    .map((p, i) => `[CHUNK ${i+1}] ${p.text || p.content || ''}`)
    .join('\n\n');

  return `[ROLE: ADVANCED REASONING ENGINE]
You are the extraction and reasoning core of the MSAJCE RAG system.

---

[OPERATIONAL PROTOCOL]

STEP 1: INTENT DETECTION
Classify query: Factual, Numerical (count/total), List, Location-based, or Follow-up.

STEP 2: CONTEXT FILTERING & EXTRACTION
Scan [RETRIEVED CONTEXT] and extract ONLY:
- Entities (Names, Roles, Departments)
- Numbers (Counts, Intake, Seats, Fees)
- Locations (Stops, Areas, Landmarks)
- Contacts (Phone numbers, Emails)

STEP 3: REASONING RULES
- NUMERICAL: For "how many", sum up distinct values.
- LOCATION: If place, return [Before -> Requested -> After] sequence.
- DRIVER: If driver/contact query, return ONLY Name and Number.
- PERSON: Return Role, Name, Contact, Dept.

STEP 4: RESPONSE GENERATION (Strictly Concise)
Use ONLY extracted data. If NO data matches, proceed to FALLBACK.

---

[RETRIEVED CONTEXT]
${context}

[USER QUESTION]
${question}

[FALLBACK CONTROL]
If context is empty: 
"I'm sorry, I don't have that info right now. 
Website: www.msajce-edu.in 
Office: +91 99400 04500 (Chennai)"

AI RESPONSE:`;
};
