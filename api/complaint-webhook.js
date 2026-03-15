import connectDB from '../database/mongo.js';
import { handleGrievanceFlow, trackComplaint, MAIN_MENU } from '../services/complaintService.js';
import { getCache, setCache } from '../services/cacheService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message || body?.callback_query?.message;
  
  if (!message) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const rawText = (message.text || body?.callback_query?.data || '').trim();

  const hasMedia = !!(message.photo || message.document || message.video || message.voice);

  if (!rawText && !hasMedia) return res.status(200).send('ok');

  try {
    await connectDB();

    // 1. /start or Back to Menu — always show main menu for Grievance Bot
    if (rawText === '/start' || rawText === '🏠 Back to Menu' || rawText === '🏫 Back to Menu') {
      await sendReply(chatId, MAIN_MENU);
      return res.status(200).send('ok');
    }

    // 2. Complaint Tracking flow
    if (rawText === '🔍 Track Complaint') {
      await setCache(`track_state:${chatId}`, true);
      await sendReply(chatId, {
        text: "🔍 *Track Your Complaint*\n\nEnter your Complaint ID (e.g., *GRV-2043*):",
        keyboard: { keyboard: [['🏠 Back to Menu']], resize_keyboard: true }
      });
      return res.status(200).send('ok');
    }

    const isTracking = await getCache(`track_state:${chatId}`);
    if (isTracking) {
      await setCache(`track_state:${chatId}`, null);
      const result = await trackComplaint(rawText);
      await sendReply(chatId, result);
      return res.status(200).send('ok');
    }

    // 3. Handle Grievance Flow (Verification, Registration, Shortcuts)
    const result = await handleGrievanceFlow(chatId, rawText, message);
    await sendReply(chatId, result);
    
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Complaint Webhook Error: ${error.message}`);
    await sendReply(chatId, { text: "⚠️ An error occurred in the grievance system. Please try again later." });
    return res.status(200).json({ status: 'error_handled' });
  }
}

/**
 * Unified reply sender for the Grievance Bot
 */
async function sendReply(chatId, result) {
  const text = typeof result === 'string' ? result : result?.text;
  const keyboard = typeof result === 'object' ? result?.keyboard : null;

  if (!text) return;
  await sendTelegramMessage(chatId, text, keyboard);
}

async function sendTelegramMessage(chatId, text, keyboard = null) {
  const token = config.telegram.complaintBotToken || config.telegram.token;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (keyboard) payload.reply_markup = keyboard;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        const err = await response.json();
        logger.error(`Grievance Bot Send Error: ${JSON.stringify(err)}`);
    }
  } catch (error) {
    logger.error(`Complaint Bot failed to send message: ${error.message}`);
  }
}
