import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import config from '../config/config.js';
import logger from './logger.js';

// Configuration
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true
});

/**
 * Uploads a file from Telegram to Cloudinary.
 * 1. Gets file path from Telegram.
 * 2. Downloads binary data.
 * 3. Uploads to Cloudinary.
 */
export const uploadTelegramMedia = async (token, fileId) => {
  try {
    if (!config.cloudinary.cloudName) {
      logger.warn("Cloudinary Cloud Name missing. Skipping upload.");
      return null;
    }

    // 1. Get file path
    const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const fileInfo = await axios.get(getFileUrl, { timeout: 10000 });
    const filePath = fileInfo.data?.result?.file_path;

    if (!filePath) return null;

    // 2. Download URL
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    // 3. Upload to Cloudinary directly from URL
    const result = await cloudinary.uploader.upload(downloadUrl, {
      folder: 'msajce-grievances',
      resource_type: 'auto',
      timeout: 10000
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    logger.error(`Media Upload Error: ${error.message}`);
    return null;
  }
};

export default cloudinary;
