/**
 * Simple tokenizer/cleaner for queries.
 */
const normalizeText = (text) => {
  const stopWords = new Set(['tell', 'me', 'about', 'the', 'is', 'who', 'what', 'where', 'a', 'an', 'of', 'for', 'in', 'on', 'with']);
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => !stopWords.has(word))
    .join(' ')
    .trim();
};

/**
 * Creates the RAG prompt.
 */
const buildPrompt = (question, contextParts) => {
  const context = contextParts.length > 0 
    ? contextParts.map(p => p.text).join('\n---\n')
    : "No internal documents found.";

  return `You are the Official AI Representative for Mohammed Sathak A.J. College of Engineering (MSAJCE). 

Strict Rules:
- You ONLY answer questions relate to MSAJCE. 
- Do NOT provide general definitions (e.g., do not define what a "Principal" or "Placement" is in general terms). 
- If the information is in the CONTEXT below, use it to provide a specific, professional answer. 
- If the information is NOT in the CONTEXT, you may use your internal knowledge about MSAJCE if you are 100% sure, or politely say you don't have that specific detail.
- Always assume the user is asking about MSAJCE.

COLLEGE CONTEXT:
${context}

USER QUESTION:
"${question}"

Answer the question professionally as the college representative:`;
};

module.exports = { normalizeText, buildPrompt };
