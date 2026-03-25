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
 * STAGE 1: CORE REASONING PROMPT (HIDDEN FROM USER)
 * This handles correctness, grounding, and preventing hallucination.
 */
export const buildReasoningPrompt = (question, contextParts, chatHistory = "None") => {
  const context = contextParts
    .map((p, i) => `[CHUNK ${i+1}] ${p.text || p.content || ''}`)
    .join('\n\n');

  return `You are a highly accurate AI assistant.

Answer the user's question using ONLY the provided context and conversation history.

========================
RULES
=====

1. Use ONLY the given context. Do not use outside knowledge.
2. If the context is insufficient, say: "I don't have enough information to answer that accurately."
3. Prefer the most relevant and specific information.
4. Ignore unrelated or weakly related context.
5. For numbers, counts, or exact facts:
   * Only answer if clearly present. Do NOT guess or estimate.
6. If conflicting information exists:
   * Choose the most specific and relevant. If unclear, mention ambiguity.
7. Use conversation history to resolve references like: him, her, it, that, they.
8. Do NOT include explanations about how you arrived at the answer.
9. Do NOT mention: context, retrieval, database, embeddings, chunks.

========================
INPUT
=====

Context:
${context}

Chat History:
${chatHistory}

User Question:
${question}

========================
OUTPUT
======

Generate the correct answer.`;
};

/**
 * STAGE 2: OUTPUT FILTER PROMPT (VISIBLE TO USER)
 * This guarantees clean UX format without chain-of-thought leakage.
 */
export const buildOutputFilterPrompt = (rawAnswer, chatHistory = "None") => {
  return `You are a response formatter.

Your job is to convert the answer into a clean, user-friendly format.

========================
STRICT RULES
============

1. OUTPUT FORMAT
* Use bullet points only
* Keep each point short and clear

2. NO INTERNAL CONTENT
* Remove anything related to: reasoning, steps, analysis, chunks, context, system processes

3. NO SYSTEM LANGUAGE
* Do NOT include phrases like: "based on context", "from retrieved data", "after analysis"

4. NATURAL STYLE
* Write like a human assistant
* No robotic tone

5. FOLLOW-UP HANDLING
* If the answer refers to something (him, it, etc), replace with the actual subject from conversation

6. NO REDUNDANCY
* Do not repeat previous answers
* Only add new or relevant info

7. PRECISION
* Only include information relevant to the question

8. UNKNOWN CASE
* If answer is unknown, return one bullet: "I don't have enough information to answer that."

========================
INPUT
=====
Raw Answer:
${rawAnswer}

Chat History:
${chatHistory}

========================
FINAL OUTPUT
============
Return only the clean bullet-point answer.
No headings.
No explanations.`;
};

// ──────────────────────────────────────────────────────────
// NEXT-LEVEL UPGRADES: SEMANTIC CHUNKING, INTENT, AND QUERY REWRITING
// ──────────────────────────────────────────────────────────

/**
 * 1. SEMANTIC CHUNKING PROMPT
 * Used in ingestionService.js to split raw data intelligently.
 */
export const buildSemanticChunkingPrompt = (rawText) => {
  return `You are a data processing assistant.

Your task is to split the given text into semantically meaningful chunks.

========================
RULES
=====

1. Each chunk must represent ONE clear topic or idea.
2. Do NOT split randomly by length.
3. Do NOT mix multiple topics in one chunk.
4. Keep related sentences together.
5. Preserve important details (numbers, names, facts).
6. Each chunk should be self-contained and understandable on its own.
7. Avoid very small chunks unless necessary.
8. Avoid very large chunks that contain multiple topics.

========================
OUTPUT FORMAT
=============

Return a JSON array like this:

[
  {
    "title": "Short topic title",
    "content": "Clean, well-structured text for that topic"
  }
]

========================
INPUT
=====

Text:
${rawText}`;
};

/**
 * 2. INTENT CLASSIFIER PROMPT
 * Replaces regex mathing in intentService.js.
 */
export const buildIntentClassifierPrompt = (question) => {
  return `You are an intent classification system.

Classify the user query into ONE of the following:

* "rag" -> for explanations, descriptions, general knowledge
* "structured" -> for exact data like counts, lists, specific facts
* "live" -> for time-sensitive or real-time information

========================
RULES
=====

1. Choose ONLY one intent.
2. Do NOT explain your reasoning.
3. Focus on what the user is asking, not keywords alone.
4. If unsure, choose the closest matching intent.

========================
OUTPUT FORMAT
=============

Return JSON only:
{
  "intent": "rag | structured | live",
  "confidence": 0.0 to 1.0
}

========================
INPUT
=====

Query:
${question}`;
};

/**
 * 3. QUERY REWRITING PROMPT (FOR MEMORY)
 * Fixes pronoun resolution and implicit context.
 */
export const buildQueryRewritingPrompt = (question, chatHistory) => {
  return `You are a query rewriting assistant.

Your task is to rewrite the user's query into a clear, standalone question.

========================
RULES
=====

1. Resolve references like: him, her, it, they, that, those
2. Use the conversation history to replace them with the correct subject.
3. Keep the meaning EXACTLY the same.
4. Do NOT add new information.
5. Do NOT explain anything.

========================
OUTPUT FORMAT
=============

Return ONLY the rewritten query as plain text.

========================
INPUT
=====

Chat History:
${chatHistory}

User Query:
${question}`;
};
