import { performHybridSearch } from '../services/retrievalService.js';
import connectDB from '../database/mongo.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  try {
    await connectDB();
    const results = await performHybridSearch('How many acres is the campus?');
    
    res.json({
        ok: true,
        count: results.length,
        top_scores: (results || []).slice(0, 5).map(r => ({ score: r.score, title: r.title || 'Untitled', type: r.matchType })),
        top_snippet: (results && results.length > 0) ? (results[0].text || results[0].content || '').slice(0, 500) + '...' : 'nothing'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
