import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../utils/logger.js';

let isConnected = false;
let pingInterval = null;

/**
 * Pings MongoDB every 4 minutes to prevent Atlas from closing idle connections.
 */
const startKeepAlive = () => {
  if (pingInterval) return; // Already running
  pingInterval = setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        logger.info('[MongoDB] Keep-alive ping OK');
      } else {
        logger.warn('[MongoDB] Keep-alive: connection lost, reconnecting...');
        isConnected = false;
        await connectDB();
      }
    } catch (err) {
      logger.warn(`[MongoDB] Keep-alive ping failed: ${err.message}`);
      isConnected = false;
    }
  }, 4 * 60 * 1000); // Every 4 minutes
};

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  try {
    logger.info('[MongoDB] Connecting...');
    const conn = await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      serverSelectionTimeoutMS: 10000,  // 10s — handles Atlas cold starts
      heartbeatFrequencyMS: 30000,       // Heartbeat every 30s
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    isConnected = true;
    logger.info(`[MongoDB] Connected: ${conn.connection.host}`);

    // Handle unexpected disconnects
    mongoose.connection.on('disconnected', () => {
      logger.warn('[MongoDB] Disconnected. Will reconnect on next request.');
      isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`[MongoDB] Connection error: ${err.message}`);
      isConnected = false;
    });

    // Start keep-alive ping
    startKeepAlive();

  } catch (error) {
    logger.error(`[MongoDB] Connection Error: ${error.message}`);
    isConnected = false;
    throw error;
  }
};

export default connectDB;
