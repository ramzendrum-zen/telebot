import fetch from 'node-fetch';
import connectDB from '../database/mongo.js';
import { handleGrievanceFlow, trackComplaint, MAIN_MENU } from '../services/complaintService.js';
import { getCache, setCache } from '../services/cacheService.js';
import { pushLog, updateMetrics } from '../services/monitorService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message || body?.callback_query?.message;
  
  if (!message) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const startTime = Date.now();
  const rawText = (message.text || body?.callback_query?.data || '').trim();
  const hasMedia = !!(message.photo || message.document || message.video || message.voice);

  if (!rawText && !hasMedia) return res.status(200).send('ok');

  try {
    await connectDB();

    // Delegate all routing and flow logic to the deterministic service
    const result = await handleGrievanceFlow(chatId, rawText, message);
    
    if (result) {
        await sendReply(chatId, result);
    }
    
    const latency = Date.now() - startTime;
    await pushLog('grievance', 'info', `Grievance Cmd: ${rawText.slice(0, 80)}`, { latency });
    await updateMetrics('grievance', latency, true);

    return res.status(200).json({ status: 'success' });

  } catch (error) {
    logger.error(`Complaint Webhook CRASH: ${error.stack}`);
    await sendReply(chatId, { 
      text: "⚠️ *System Timeout or Error*\n\nWe encountered a temporary issue processing your request. Please try again in a few moments.",
      keyboard: MAIN_MENU.keyboard
    });
    return res.status(200).json({ status: 'error_handled' });
  }
}

/**
 * Robust reply sender for Grievance Bot
 */
async function sendReply(chatId, result) {
  const text = typeof result === 'string' ? result : result?.text;
  const keyboard = typeof result === 'object' ? result?.keyboard : null;

  if (!text) return;

  const token = config.telegram.complaintBotToken || config.telegram.token;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  if (keyboard) payload.reply_markup = keyboard;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    logger.error(`Send Message Fail: ${err.message}`);
  }
}
