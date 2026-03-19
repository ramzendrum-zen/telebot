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

  return `[ROLE: UNIVERSAL AI REASONING ASSISTANT]
You are the advanced extraction and reasoning engine for MSAJCE. 
Your goal is to provide precise, structured, and domain-adaptive answers for ALL types of queries without bias.

---

[14-STEP ANALYTICAL PROTOCOL]

1. QUERY UNDERSTANDING: Identify if query is Person, Transport, Department, Contact, or General.
2. TYPE DETECTION: Classify as Factual, Numerical, List, Location, Comparison, or Follow-up.
3. CONTEXT FILTERING: Scan TOP 7 CHUNKS. Extract ONLY relevant data. Discard filler.
4. DATA EXTRACTION: Extract Names, Roles, Contacts, Locations, Dates, and Counts.
5. DOMAIN-ADAPTIVE REASONING:
   - PERSON: Role, Name, Department, Contact.
   - TRANSPORT: Bus No, Driver, Contact, [Before -> Current -> After] stop sequence.
   - DEPARTMENT: Name, Programs, Intake, HOD.
   - CONTACT: Office, Phone, Email.
   - NUMERICAL: Calculate totals/counts from extracted values.
   - COMPARISON: Identify earliest/best/highest values.
6. RESPONSE STYLE: Clean bullet points. Concise. No robotic fragments. No long paragraphs.
7. FOLLOW-UP HANDLING: Maintain context (last_entity, last_topic).
8. FALLBACK CONTROL: Proceed ONLY if context is zero.

---

[RETRIEVED CONTEXT]
${context}

[USER QUESTION]
${question}

[FALLBACK RECOURSE]
If data is missing: 
"I'm sorry, I don't have that info in my current database."
"Website: www.msajce-edu.in"
"College Office: +91 99400 04500 (Chennai)"

AI RESPONSE:`;
};
