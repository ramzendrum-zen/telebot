import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import config from './config/config.js';

dotenv.config();

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

async function readLogs() {
  const LOG_KEY = 'bot_live_logs_v2';
  try {
    const logs = await redis.lrange(LOG_KEY, 0, 10);
    console.log("--- Latest Redis Logs ---");
    logs.forEach(l => {
      const entry = typeof l === 'string' ? JSON.parse(l) : l;
      console.log(`[${entry.timestamp}] [${entry.type}] ${entry.message}`);
      if (entry.metadata) console.log(`Metadata: ${JSON.stringify(entry.metadata)}`);
      console.log("---");
    });
  } catch (e) {
    console.error("Error reading logs:", e);
  }
}

readLogs();
