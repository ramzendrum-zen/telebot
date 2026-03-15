const { sendMessage } = require('../services/telegramService');
const { getSmartReply } = require('../services/geminiService');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const handleWebhook = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.text) {
      return res.status(200).send('ok'); // Telegram expects 200 even for non-text messages if we don't handle them
    }

    const chatId = message.chat.id;
    const userText = message.text.toLowerCase().trim();
    const originalText = message.text;

    logger.info(`Received message from ${chatId}: ${originalText}`);

    let replyText = "";

    if (userText === "hello") {
      replyText = "Hello! I am your Telegram bot.";
    } else {
      const smartReply = await getSmartReply(originalText);
      replyText = `You said: ${originalText}\n\n*Smart Reply:*\n${smartReply}`;
    }

    await sendMessage(chatId, replyText);

    // Save to DB
    await Message.create({
      chatId,
      userMessage: originalText,
      botReply: replyText
    });

    res.status(200).json({
      status: 'success',
      chat_id: chatId,
      message: originalText,
      reply: replyText
    });
  } catch (error) {
    logger.error('Webhook Controller Error: ', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

module.exports = { handleWebhook };
