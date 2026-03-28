import { Redis } from '@upstash/redis';
import config from './config/config.js';
import fs from 'fs';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

async function dumpLogs() {
  try {
    const logs = await redis.lrange('bot_live_logs_v2', 0, 99);
    fs.writeFileSync('full_logs.json', JSON.stringify(logs.map(l => typeof l === 'string' ? JSON.parse(l) : l), null, 2));
    console.log("Logs dumped to full_logs.json");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpLogs();
