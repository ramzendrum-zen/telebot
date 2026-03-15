import { Redis } from '@upstash/redis';
import config from '../config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

const LOG_KEY = 'bot_live_logs';
const METRICS_KEY = 'bot_metrics';

export const pushLog = async (type, message, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type, // 'info', 'error', 'rag_step', 'intent'
    message,
    metadata
  };
  
  try {
    // Keep last 50 logs
    await redis.lpush(LOG_KEY, JSON.stringify(logEntry));
    await redis.ltrim(LOG_KEY, 0, 49);
  } catch (e) {
    console.error("Failed to push to Redis logs:", e);
  }
};

export const updateMetrics = async (latency, success = true) => {
  try {
    const metrics = await redis.get(METRICS_KEY) || { avg_latency: 0, total_requests: 0, success_rate: 100 };
    
    metrics.total_requests += 1;
    metrics.avg_latency = (metrics.avg_latency * (metrics.total_requests - 1) + latency) / metrics.total_requests;
    
    await redis.set(METRICS_KEY, JSON.stringify(metrics));
  } catch (e) {
    console.error("Failed to update Redis metrics:", e);
  }
};

export const getLiveBoardData = async () => {
  try {
    const logs = await redis.lrange(LOG_KEY, 0, -1);
    const metrics = await redis.get(METRICS_KEY);
    return {
      logs: logs.map(l => typeof l === 'string' ? JSON.parse(l) : l),
      metrics: metrics || { avg_latency: 0, total_requests: 0, success_rate: 100 }
    };
  } catch (e) {
    return { logs: [], metrics: {} };
  }
};
