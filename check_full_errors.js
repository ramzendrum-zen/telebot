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
    const logs = await redis.lrange(LOG_KEY, 0, 50);
    for (let l of logs) {
        const entry = typeof l === 'string' ? JSON.parse(l) : l;
        if (entry.type === 'error') {
            console.log("FULL ERROR ENTRY:");
            console.log(JSON.stringify(entry, null, 2));
            console.log("-----------------------------------------");
        }
    }
  } catch (e) {
    console.error("Error reading logs:", e);
  }
}

checkErrors();
