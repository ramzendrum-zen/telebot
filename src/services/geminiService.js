const axios = require('axios');
const logger = require("../utils/logger");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const getSmartReply = async (userMessage, context = "") => {
  try {
    if (!OPENROUTER_API_KEY) {
      logger.error("CRITICAL: OPENROUTER_API_KEY is missing from process.env");
      throw new Error("OPENROUTER_API_KEY is missing");
    }

    let prompt = "";
    if (context) {
      prompt = `You are a helpful assistant for MSAJCE (Mohammed Sathak A.J. College of Engineering). 
      Use the following information to answer the user's question:
      
      CONTEXT:
      ${context}
      
      USER QUESTION:
      "${userMessage}"
      
      If the information is not in the context, use your general knowledge but mention that this is general info. Keep the reply short and friendly.`;
    } else {
      prompt = `You are a helpful Telegram bot. The user said: "${userMessage}". Give a short, smart, and friendly response.`;
    }

    logger.info(`Requesting OpenRouter for message: ${userMessage.substring(0, 50)}...`);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://msajce-bot.vercel.app",
          "X-Title": "MSAJCE Bot"
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      return response.data.choices[0].message.content;
    } else {
      logger.error("OpenRouter Unexpected Response Structure:", response.data);
      throw new Error("Invalid response format from OpenRouter");
    }
  } catch (error) {
    const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
    logger.error(`OpenRouter API Error: ${errorDetail}`);
    
    // Return a more descriptive error back to the user for debugging
    return `Error: ${error.message}. ${error.response ? '(Check Vercel logs for API response)' : ''}`;
  }
};

module.exports = { getSmartReply };
