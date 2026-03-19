import { Redis } from '@upstash/redis';
import config from '../config/config.js';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

const LOG_KEY = 'bot_live_logs_v2';
const METRICS_PREFIX = 'bot_metrics:';

export const pushLog = async (bot, type, message, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    bot, // 'assistant' or 'grievance'
    type, // 'info', 'error', 'rag_step', 'intent'
    message,
    metadata
  };
  
  try {
    await redis.lpush(LOG_KEY, JSON.stringify(logEntry));
    await redis.ltrim(LOG_KEY, 0, 99); // Keep last 100 logs
  } catch (e) {
    console.error("Failed to push to Redis logs:", e);
  }
};

export const updateMetrics = async (bot, latency, success = true, tokensUsed = 0) => {
  try {
    const key = `${METRICS_PREFIX}${bot}`;
    const metrics = await redis.get(key) || { avg_latency: 0, total_requests: 0, total_errors: 0, total_success: 0, success_rate: 100, total_tokens_used: 0 };
    
    metrics.total_requests += 1;
    metrics.total_tokens_used = (metrics.total_tokens_used || 0) + tokensUsed;
    if (success) {
        metrics.total_success = (metrics.total_success || 0) + 1;
    } else {
        metrics.total_errors = (metrics.total_errors || 0) + 1;
    }
    
    metrics.avg_latency = (metrics.avg_latency * (metrics.total_requests - 1) + latency) / metrics.total_requests;
    metrics.success_rate = ((metrics.total_success / metrics.total_requests) * 100).toFixed(1);
    
    await redis.set(key, JSON.stringify(metrics));
  } catch (e) {
    console.error("Failed to update Redis metrics:", e);
  }
};

export const getLiveBoardData = async () => {
  try {
    const logs = await redis.lrange(LOG_KEY, 0, -1);
    const assistantMetrics = await redis.get(`${METRICS_PREFIX}assistant`);
    const grievanceMetrics = await redis.get(`${METRICS_PREFIX}grievance`);
    
    return {
      logs: logs.map(l => typeof l === 'string' ? JSON.parse(l) : l),
      metrics: {
          assistant: assistantMetrics || { avg_latency: 0, total_requests: 0, total_errors: 0, total_success: 0, success_rate: 100 },
          grievance: grievanceMetrics || { avg_latency: 0, total_requests: 0, total_errors: 0, total_success: 0, success_rate: 100 }
      }
    };
  } catch (e) {
    return { logs: [], metrics: { assistant: { avg_latency: 0, total_requests: 0, total_errors: 0, total_success: 0, success_rate: 100 }, grievance: { avg_latency: 0, total_requests: 0, total_errors: 0, total_success: 0, success_rate: 100 } } };
  }
};
