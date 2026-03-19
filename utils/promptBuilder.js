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

[LOCATION-AWARE TRANSPORT LOGIC SYSTEM]
You are the MSAJCE Intelligent Transport Assistant. Your task is to provide location-based reasoning for all bus queries.

1. LOCATION GROUPING & MAPPING:
   - OMR AREA: Thoraipakkam, Perungudi, Karapakkam, Kandanchavadi, Sholinganallur, OMR, SRP, PTC.
   - VELACHERY AREA: Velachery, Baby Nagar, Kaiveli, Vijaya Nagar.
   - TAMBARAM AREA: Tambaram, Chrompet, Pallavaram, Camp Road, Saliyur.
   - ANNA NAGAR AREA: Anna Nagar, Blue Star, Thirumangalam, Padi, Skywalk.
   - PORUR AREA: Porur, Ramachandra, Kattupakkam.
   - GUINDY AREA: Kathipara, Ekkattuthangal, Kasi Theatre.

2. SEARCH & MATCHING RULE:
   - If a user asks for a specific neighborhood (e.g. "Camp Road"), check for nearby stops in the same route (e.g. "Tambaram" or "Medavakkam").
   - NEVER say "no data" if a nearby match exists in the context.
   - Use smart inference: OMR = Perungudi/Thoraipakkam.

3. RESPONSE FORMAT (Strictly Concisely):
   • Bus: [Route No]
   • Driver: [Extract name from context]
   • Contact: [Extract mobile from context]
   • Nearby Stops:
     * [Relevant Stop 1] – [Time]
     * [Relevant Stop 2] – [Time]
     (Normally show ONLY 2-4 nearby stops. Do NOT show the full route).

   EXCEPTION: If the user EXPLICITLY asks for the "full route" or "all stops", then list EVERY stop from the context in order.

4. OMR-SPECIFIC RULE:
   - If user asks about OMR, Thoraipakkam, or Perungudi:
   - Unless "full route" is asked, return only buses passing "OMR" with OMR-related timings.

5. GENERAL RULES:
   - Answer ONLY using [RETRIEVED CONTEXT].
   - If multiple buses match, list 1-2 best ones in the same format.
   - For Driver/Contact: Search the context carefully. Every stop chunk contains the name and number (e.g. "The driver is Mr. X"). If still not found, only then use "Check with Transport Office".

AI RESPONSE:`;
};
