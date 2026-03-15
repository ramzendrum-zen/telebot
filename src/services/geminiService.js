const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getSmartReply = async (userMessage) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a helpful Telegram bot. The user said: "${userMessage}". Give a short, smart, and friendly response.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error("Gemini API Error: ", error);
    return "I'm having trouble thinking of a smart reply right now, but I heard you!";
  }
};

module.exports = { getSmartReply };
