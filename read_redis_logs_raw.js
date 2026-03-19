import { Redis } from '@upstash/redis';
import config from './config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

const LOG_KEY = 'bot_live_logs_v2';

async function readLogs() {
  const logs = await redis.lrange(LOG_KEY, 0, 10);
  for (const l of logs) {
    console.log(JSON.stringify(l));
  }
  process.exit(0);
}

readLogs().catch(console.error);
