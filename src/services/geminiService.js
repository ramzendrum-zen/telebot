const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getSmartReply = async (userMessage, context = "") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error(`Gemini API Error: ${error.message}`, { stack: error.stack });
    return "I'm having trouble thinking of a smart reply right now, but I heard you! Please check if GEMINI_API_KEY is set in Vercel.";
  }
};

module.exports = { getSmartReply };
