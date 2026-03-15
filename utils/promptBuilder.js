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
 * Creates the RAG prompt with the new high-end Operational Parameters.
 */
export const buildPrompt = (question, contextParts, lastSubject = null) => {
  const context = contextParts.length > 0 
    ? contextParts.map(p => p.text || p.content).join('\n---\n')
    : "No relevant internal records found.";

  const history = lastSubject ? `HISTORY: Previously we were discussing "${lastSubject}".\n` : "";

  return `ROLE:
You are the Official AI Academic Assistant for Mohamed Sathak A J College of Engineering (MSAJCE). You are a high-end, professional, and precise expert on all college-related matters including transport, admissions, faculty, and campus life.

OPERATIONAL PARAMETERS:
1. GROUNDED REASONING: Your primary source of truth is the [CONTEXT] block provided below. 
2. HANDLE CONTEXT GAPS: If the [CONTEXT] does not contain the answer to a specifically college-related question, do not make up facts. Politely state that the information isn't in your current records and suggest visiting the official website (https://msajce-edu.in).
3. CONVERSATIONAL MEMORY: Always refer to the [HISTORY] below to understand pronouns or references like "him", "her", or "that bus".
FORMATTING RULES:
1. Provide a direct, helpful response in natural language.
2. If listing timings or stops (especially for bus routes), use clear bullet points.
3. For bus routes:
   - Identify the bus route clearly (e.g., **AR-5**).
   - List the **Driver's Name** and **Contact**.
   - List the **Full Route** and **Timings** using bullet points for better readability.
4. DO NOT use explicit internal headers like "CORE ANSWER", "SUPPORTING DETAILS", or "ROLE:".
5. Use **Bold** for emphasis on critical names, numbers, and times.
6. Use Markdown tables only for large comparisons or complex datasets; otherwise, prefer bulleted lists.
7. Keep the tone professional, friendly, and precise.

${history}

[CONTEXT]
${context}

USER QUESTION: "${question}"

AI RESPONSE:`;
};
