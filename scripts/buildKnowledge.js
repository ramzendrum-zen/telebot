/**
 * MSAJCE Knowledge Builder
 * 
 * This script enriches every document in the vector_store collection with:
 * - entities: persons, departments, roles, locations extracted from the text
 * - query_variations: 5 different ways a student might ask for this info
 * - keywords: key terms for hybrid keyword search
 * - summary: a one-sentence summary
 *
 * Run: node scripts/buildKnowledge.js
 */

import mongoose from 'mongoose';
import config from '../config/config.js';
import dotenv from 'dotenv';

dotenv.config();

const BATCH_SIZE = 5; // Process 5 docs at a time to avoid rate limits
const DELAY_MS = 500; // Delay between batches

async function buildKnowledge() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  const col = mongoose.connection.db.collection(config.mongodb.vectorCollection);

  // Get all documents and re-enrich
  const docs = await col.find({}).toArray();
  console.log(`\n📚 Re-enriching ALL ${docs.length} documents...\n`);
  await processBatches(col, docs);


  console.log('\n✅ Knowledge enrichment complete!');
  process.exit(0);
}

async function processBatches(col, docs) {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (doc) => {
      try {
        const enriched = await enrichDocument(doc.text || doc.content || '');
        if (enriched) {
          await col.updateOne(
            { _id: doc._id },
            {
              $set: {
                entities: enriched.entities,
                keywords: enriched.keywords,
                query_variations: enriched.query_variations,
                summary: enriched.summary
              }
            }
          );
          processed++;
          process.stdout.write(`\r✅ ${processed}/${docs.length} enriched | ❌ ${failed} failed`);
        }
      } catch (e) {
        failed++;
        process.stdout.write(`\r✅ ${processed}/${docs.length} enriched | ❌ ${failed} failed`);
      }
    }));

    // Rate limit delay between batches
    if (i + BATCH_SIZE < docs.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\n📊 Summary: ${processed} enriched, ${failed} failed`);
}

async function enrichDocument(text) {
  if (!text || text.trim().length < 10) return null;

  const prompt = `You are a knowledge extraction system for MSAJCE (Mohamed Sathak A J College of Engineering).

Analyze this text and return a JSON object with NO extra text, ONLY the JSON:

TEXT:
"${text.slice(0, 600)}"

Return this exact JSON structure:
{
  "summary": "one clear sentence summarizing the main fact",
  "entities": ["list of key named entities: persons, roles, departments, routes, locations"],
  "keywords": ["5-8 keywords a student might use to search for this information"],
  "query_variations": [
    "5 different ways a student might ask for this information",
    "include short queries like role names alone",
    "include full sentence questions",
    "include casual phrasings",
    "include indirect questions"
  ]
}

Rules:
- For principal info: include queries like "principal", "who is the principal", "college head", "who runs msajce"
- For HOD info: include queries like "hod cse", "head of cse department", "cse department head"
- For bus routes: include queries like "bus from [stop]", "ar-8 route", "timings for ar-8"
- For faculty: include queries like "name of [faculty role]", "[person name]"
- Keywords must be lowercase single words or short phrases
- Return ONLY valid JSON`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openRouter.models.cheap,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Enrichment failed: ${e.message}`);
  }
}

buildKnowledge().catch(console.error);
