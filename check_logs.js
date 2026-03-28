import { Redis } from '@upstash/redis';
import config from './config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

async function getLogs() {
  try {
    const logs = await redis.lrange('bot_live_logs_v2', 0, 10);
    logs.forEach(l => {
        const log = typeof l === 'string' ? JSON.parse(l) : l;
        console.log(`[${log.timestamp}] [${log.bot}] [${log.type}] ${log.message}`);
        if (log.metadata) {
            console.log('Metadata:', JSON.stringify(log.metadata, null, 2));
        }
        console.log('-------------------');
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getLogs();
