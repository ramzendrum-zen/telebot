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
    ? contextParts.map(p => `- ${p.text}`).join('\n')
    : "No internal documents found.";

  return `You are the official AI assistant for Mohammed Sathak A.J. College of Engineering (MSAJCE). 

COLLEGE CONTEXT:
${context}

USER QUESTION:
"${question}"

INSTRUCTIONS:
1. Answer using the COLLEGE CONTEXT first.
2. If the answer is not in the context, use your general knowledge but clearly state that you are using general knowledge.
3. Keep the response professional, friendly, and concise.`;
};

module.exports = { normalizeText, buildPrompt };
