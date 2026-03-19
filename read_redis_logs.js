import { Redis } from '@upstash/redis';
import config from './config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

const LOG_KEY = 'bot_live_logs_v2';

async function readLogs() {
  const logs = await redis.lrange(LOG_KEY, 0, 20);
  console.log("Recent Logs:");
  logs.forEach(l => {
    const log = typeof l === 'string' ? JSON.parse(l) : l;
    console.log(`[${log.timestamp}] [${log.bot}] [${log.type}] ${log.message}`);
    if (log.metadata) console.log("Metadata:", JSON.stringify(log.metadata, null, 2));
    console.log("---");
  });
  process.exit(0);
}

readLogs().catch(console.error);
