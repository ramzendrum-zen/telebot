import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkErrors() {
  const LOG_KEY = 'bot_live_logs_v2';
  try {
    const logs = await redis.lrange(LOG_KEY, 0, 100);
    console.log(`Checking ${logs.length} recent logs for errors...`);
    logs.forEach(l => {
        const entry = typeof l === 'string' ? JSON.parse(l) : l;
        if (entry.type === 'error') {
            console.log(`[${entry.timestamp}] [${entry.type}] ${entry.message}`);
            if (entry.metadata) console.log(`   Metadata: ${JSON.stringify(entry.metadata)}`);
            console.log("-----------------------------------------");
        }
    });
  } catch (e) {
    console.error("Error reading logs:", e);
  }
}

checkErrors();
