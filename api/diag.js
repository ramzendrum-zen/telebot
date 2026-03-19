import { performHybridSearch } from '../services/retrievalService.js';
import connectDB from '../database/mongo.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  try {
    await connectDB();
    const results = await performHybridSearch('How many acres is the campus?');
    const transportResults = await performHybridSearch('Who is the driver for route AR-5?');
    const admissionResults = await performHybridSearch('How many seats for CSE?');
    
    res.json({
        ok: true,
        count: results.length + transportResults.length + admissionResults.length,
        acre_test: {
           score: results[0]?.score || 0,
           snippet: results[0]?.text?.slice(0, 100) || 'none'
        },
        transport_test: {
           score: transportResults[0]?.score || 0,
           driver: transportResults[0]?.metadata?.driver || 'unknown',
           snippet: transportResults[0]?.content || 'none'
        },
        admission_test: {
           score: admissionResults[0]?.score || 0,
           snippet: admissionResults[0]?.content?.slice(0, 150) || 'none'
        }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
