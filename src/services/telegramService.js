const axios = require('axios');
const logger = require('../utils/logger');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const sendMessage = async (chatId, text) => {
  try {
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
    return response.data;
  } catch (error) {
    logger.error('Telegram API Error: ', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = { sendMessage };
