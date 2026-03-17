import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../utils/logger.js';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    logger.info(`Connecting to MongoDB...`);
    const conn = await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

export default connectDB;
