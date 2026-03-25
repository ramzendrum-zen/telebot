import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function readGrievanceLogs() {
  const LOG_KEY = 'bot_live_logs_v2';
  try {
    const logs = await redis.lrange(LOG_KEY, 0, 50);
    console.log(`Searching in ${logs.length} logs...`);
    logs.forEach(l => {
      const entry = typeof l === 'string' ? JSON.parse(l) : l;
      if (entry.bot === 'grievance') {
          console.log(`[${entry.timestamp}] [${entry.type}] ${entry.message}`);
          if (entry.metadata) {
              console.log(`   Latency: ${entry.metadata.latency || 'N/A'}ms`);
          }
          console.log("-----------------------------------------");
      }
    });
  } catch (e) {
    console.error("Error reading logs:", e);
  }
}

readGrievanceLogs();
