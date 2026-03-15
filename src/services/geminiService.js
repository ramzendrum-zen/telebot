const axios = require('axios');
const logger = require("../utils/logger");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const getSmartReply = async (userMessage, context = "") => {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing in environment variables");
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
          "HTTP-Referer": "https://msajce-bot.vercel.app", // Optional
          "X-Title": "MSAJCE Bot" // Optional
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error(`OpenRouter API Error: ${error.message}`, { stack: error.stack, data: error.response?.data });
    return "I'm having trouble thinking of a smart reply right now. Please ensure OPENROUTER_API_KEY is correctly set.";
  }
};

module.exports = { getSmartReply };
