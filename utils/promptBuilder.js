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
 * BUILD REASONING PROMPT (STRICT GROUNDING)
 * Role: Senior MSAJCE Systems Analyst (Project Phoenix)
 * Objective: Synthesize facts from retrieved context with 0% hallucination.
 */
export const buildReasoningPrompt = (query, chunks, history) => {
    const context = chunks.map((c, i) => `[DOC-${i+1}] ${c.text || c.content}`).join('\n\n');
    
    return `
Role: Senior Staff at Mohamed Sathak A. J. College of Engineering (MSAJCE). 
Task: Answer the user question based ONLY on the provided [CONTEXT] below.

STRICT RULES:
1. Answer ONLY using information from [CONTEXT].
2. If the answer is NOT present, state: "I don't have that information in my current knowledge base."
3. Do NOT guess, assume, or infer beyond the absolute facts provided.
4. Accuracy is the highest priority. 

[CONTEXT]
${context}

Chat History:
${chatHistory}

User Question:
${question}

========================
OUTPUT
======

Synthesize a helpful, complete, and accurate answer.`;
};

/**
 * STAGE 2: OUTPUT FILTER PROMPT (VISIBLE TO USER)
 * This guarantees clean UX format without chain-of-thought leakage.
 */
export const buildOutputFilterPrompt = (rawAnswer, chatHistory = "None") => {
  return `You are a professional response formatter for an institutional assistant.

Your job is to take the "Raw Answer" and convert it into a clean, professional, and user-friendly response.

========================
RULES
====

1. NO CHAIN-OF-THOUGHT: Remove any internal reasoning, analysis steps, or mentions of "based on the context".
2. NO ROBOTIC TAGS: Do NOT start with "Answer:", "Response:", or any bullet points unless a list is actually required.
3. NATURAL FLOW: Prefer a natural, professional paragraph for descriptions or entity queries (like "Who is X?"). Use bullet points ONLY for lists (routes, timings, seats, etc).
4. SUBJECT RESOLUTION: Ensure pronouns are resolved naturally based on the conversation history.
5. CLEANLINESS: Remove any redundant information or repetitive phrases.

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
Return ONLY the polished and professional response. No extra text or meta-commentary.`;
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

1. RESOLVE PRONOUNS: Focus on resolving pronouns (him, her, it, they, that, those).
2. CONTEXT AWARENESS: Use the conversation history to understand WHAT is being discussed.
3. CONSERVATIVE REWRITING: Do NOT rewrite queries that are already standalone or clear.
4. IDENTITY PROTECTION: If the user provides a NEW name (e.g. "Who is X?"), do NOT assume it's related to the previous topic (e.g. "Who is the bus driver X?") unless the user explicitly links them.
5. NO INVENTING: Do NOT add new information or assumed relationships.
6. NO EXPLANATIONS: Do NOT explain anything.

========================
OUTPUT FORMAT
=============

Return ONLY the rewritten standalone query as plain text. If no rewrite is needed, return the original query exactly.

========================
INPUT
=====

Chat History:
${chatHistory}

User Query:
${question}`;
};
