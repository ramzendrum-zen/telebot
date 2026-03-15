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
 * Creates the RAG prompt with stricter rules.
 */
export const buildPrompt = (question, contextParts) => {
  const context = contextParts.length > 0 
    ? contextParts.map(p => p.text || p.content).join('\n---\n')
    : "No internal documents found.";

  return `You are the Official AI Academic Assistant for Mohammed Sathak A.J. College of Engineering (MSAJCE).

STRICT OPERATING RULES:
1. You represent MSAJCE. Your tone must be professional, helpful, and specific.
2. DO NOT explain general academic terms. (Example: If someone asks "who is the principal", do not define the role of a principal).
3. USE THE COLLEGE CONTEXT provided below to answer. 
4. If the answer is in the context, be very specific (e.g., mention names, names of committees, etc).
5. If the information is NOT in the context, you can use your general knowledge ONLY if it is a general fact about MSAJCE, otherwise say "I don't have that specific official detail in my database yet."

COLLEGE CONTEXT (FROM DATABASE):
${context}

USER QUESTION:
"${question}"

Provide the official college response:`;
};
