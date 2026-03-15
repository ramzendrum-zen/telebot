import connectDB from '../database/mongo.js';
import { getCache, setCache } from '../services/cacheService.js';
import { performHybridSearch } from '../services/retrievalService.js';
import { getAIReponse } from '../services/aiService.js';
import { normalizeText, buildPrompt } from '../utils/promptBuilder.js';
import { getUserMemory, setUserMemory, rewriteQuery } from '../services/historyService.js';
import { detectIntent, normalizeQuery } from '../services/intentService.js';
import { pushLog, updateMetrics } from '../services/monitorService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

import { handleGrievanceFlow, trackComplaint } from '../services/complaintService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const body = req.body;
  const message = body?.message || body?.callback_query?.message;
  
  if (!message) return res.status(200).send('ok');

  const chatId = message.chat.id;
  const rawText = message.text || body?.callback_query?.data;
  
  if (!rawText) return res.status(200).send('ok');

  try {
    await connectDB();
    await pushLog('info', `Incoming: "${rawText}" (User: ${chatId})`);

    // 1. MAIN MENU / START
    if (rawText === '/start' || rawText === '🏫 Back to Menu') {
      const menuText = "🏫 **MSAJCE Grievance Bot**\n\nWelcome to the official student support portal. Please select an option:";
      const keyboard = {
        keyboard: [
          ['1️⃣ Register Complaint', '2️⃣ Track Complaint'],
          ['3️⃣ My Complaints', '4️⃣ Emergency Complaint'],
          ['5️⃣ FAQ / Help', '6️⃣ Contact Administration']
        ],
        resize_keyboard: true
      };
      await sendTelegramMessage(chatId, menuText, keyboard);
      return res.status(200).send('ok');
    }

    // 2. ROUTE TO GRIEVANCE FLOW
    const isRegistering = rawText.includes('Register Complaint') || (await getCache(`grv_state:${chatId}`)) || (await getCache(`verify_state:${chatId}`));
    
    if (isRegistering) {
      const result = await handleGrievanceFlow(chatId, rawText, message);
      if (typeof result === 'string') {
        await sendTelegramMessage(chatId, result);
      } else if (result.keyboard) {
        await sendTelegramMessage(chatId, result.text, {
          keyboard: result.keyboard,
          resize_keyboard: true,
          one_time_keyboard: true
        });
      }
      return res.status(200).send('ok');
    }

    // 3. TRACKING FLOW
    if (rawText.includes('Track Complaint')) {
        await setCache(`track_state:${chatId}`, true);
        await sendTelegramMessage(chatId, "Please enter your **Complaint ID** (e.g., GRV-2043):", { keyboard: [['🏫 Back to Menu']], resize_keyboard: true });
        return res.status(200).send('ok');
    }
    
    const isTracking = await getCache(`track_state:${chatId}`);
    if (isTracking) {
        if (rawText === '🏫 Back to Menu') {
            await setCache(`track_state:${chatId}`, null);
            // Will hit the /start logic if we just return here, but let's be explicit
        } else {
            const trackResult = await trackComplaint(rawText);
            await sendTelegramMessage(chatId, trackResult);
            await setCache(`track_state:${chatId}`, null);
            return res.status(200).send('ok');
        }
    }

    // 4. EMERGENCY COMPLAINT
    if (rawText.includes('Emergency')) {
        await sendTelegramMessage(chatId, "🚨 **Emergency Grievance**\n\nFor urgent issues like harassment or safety, your complaint will be escalated directly to the Principal. \n\nPlease select '1️⃣ Register Complaint' and choose the appropriate category.");
        return res.status(200).send('ok');
    }

    // 5. DEFAULT TO RAG (Academic Assistant)
    const normalizedQuery = normalizeQuery(rawText);
    const cleanKey = `v15:query:${normalizeText(normalizedQuery)}`;
    
    const cachedResponse = await getCache(cleanKey);
    if (cachedResponse) {
      await sendTelegramMessage(chatId, cachedResponse);
      return res.status(200).json({ status: 'cached' });
    }

    const memory = await getUserMemory(chatId);
    const intent = detectIntent(normalizedQuery);
    const enrichedQuery = rewriteQuery(normalizedQuery, memory);
    
    const contextResults = await performHybridSearch(enrichedQuery, intent);
    const finalPrompt = buildPrompt(enrichedQuery, contextResults, memory.last_entity);
    
    const aiReply = await getAIReponse(finalPrompt);
    
    await setCache(cleanKey, aiReply);
    await sendTelegramMessage(chatId, aiReply);
    
    if (intent !== 'general') await setUserMemory(chatId, normalizedQuery, intent);

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    logger.error(`Webhook Error: ${error.message}`);
    await pushLog('error', `FATAL: ${error.message}`);
    await sendTelegramMessage(chatId, "I'm having a bit of trouble connecting to the system. Please try again in 1 minute.");
    return res.status(200).send('ok');
  }
}

async function sendTelegramMessage(chatId, text, keyboard = null) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  
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

    if (response.ok) {
      await pushLog('info', `Telegram Message Sent to ${chatId}`);
      return;
    }

    const firstError = await response.json();
    logger.error(`Telegram Error: ${response.status} - ${JSON.stringify(firstError)}`);

    // Fallback to plain text if Markdown fails (e.g. 400 Bad Request)
    if (response.status === 400 && payload.parse_mode === 'Markdown') {
      await pushLog('warning', `Markdown failed for ${chatId}, falling back to plain text.`);
      delete payload.parse_mode;
      const retryResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (!retryResponse.ok) {
          const secondError = await retryResponse.json();
          await pushLog('error', `Telegram Final Send Failed: ${retryResponse.status}`, secondError);
      }
    } else {
      await pushLog('error', `Telegram Send Failed: ${response.status}`, firstError);
    }
  } catch (error) {
    logger.error(`Bot failed to send message: ${error.message}`);
    await pushLog('error', `Network Error sending to Telegram: ${error.message}`);
  }
}
