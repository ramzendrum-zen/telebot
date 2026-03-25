import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function readAllLogs() {
  const LOG_KEY = 'bot_live_logs_v2';
  try {
    const logs = await redis.lrange(LOG_KEY, 0, 20);
    console.log(`Retrieved ${logs.length} logs.`);
    logs.forEach(l => {
      const entry = typeof l === 'string' ? JSON.parse(l) : l;
      console.log(`[${entry.timestamp}] [${entry.type}] ${entry.message}`);
      if (entry.metadata) {
          console.log(`   Query: ${entry.metadata.query || 'N/A'}`);
          console.log(`   Latency: ${entry.metadata.latency || 'N/A'}ms`);
          console.log(`   Source: ${entry.metadata.source || 'N/A'}`);
          if (entry.metadata.tokens) console.log(`   Tokens: ${JSON.stringify(entry.metadata.tokens)}`);
      }
      console.log("-----------------------------------------");
    });
  } catch (e) {
    console.error("Error reading logs:", e);
  }
}

readAllLogs();
