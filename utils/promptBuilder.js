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
 * Creates the RAG prompt with shorter instructions for token saving and MEMORY awareness.
 */
export const buildPrompt = (question, contextParts, lastSubject = null) => {
  const context = contextParts.length > 0 
    ? contextParts.map(p => p.text || p.content).join('\n---\n')
    : "No relevant records found.";

  const memoryBlock = lastSubject ? `Conversation History: We were just talking about "${lastSubject}".\n` : "";

  return `You are the MSAJCE Academic Assistant. 
Rules:
1. Represent MSAJCE professionally.
2. Use the provided CONTEXT below to answer. If the context contains even partial information, share it!
3. If the user asks about "him", "her", "it", or "more", refer to the provided Conversation History.
4. Highlight NAMES using **\`Bold Monospace\`**.
5. CRITICAL: Do not be lazy. List all relevant details from the context.
6. Only say "I don't have that official detail yet" if the CONTEXT is truly empty.
7. FORMATTING: Use **bullet points** and helpful Telegram Markdown.

${memoryBlock}
CONTEXT:
${context}

QUESTION: "${question}"
Answer:`;
};
