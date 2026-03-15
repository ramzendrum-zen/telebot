import connectDB from '../database/mongo.js';
import { handleComplaintFlow } from '../services/complaintService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message;
  
  if (!message || !message.text) {
    return res.status(200).send('ok');
  }

  const chatId = message.chat.id;
  const rawText = message.text;

  try {
    await connectDB();

    logger.info(`Complaint Bot: Handling message from ${chatId}`);
    const reply = await handleComplaintFlow(chatId, rawText);
    
    await sendTelegramMessage(chatId, reply);
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Complaint Webhook Error: ${error.message}`);
    return res.status(200).json({ status: 'error_handled' });
  }
}

async function sendTelegramMessage(chatId, text) {
  const token = config.telegram.complaintBotToken || config.telegram.token;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    logger.error(`Complaint Bot failed to send message: ${error.message}`);
  }
}
