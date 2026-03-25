import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = '8187410449:AAGYTg4u75y5BSeWkkBubH7nslJMGmTEoGU';
const CHAT_ID = 7770158141;

async function sendTestMessage() {
  try {
    console.log(`Sending test message to ${CHAT_ID}...`);
    const resp = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: "🤖 *System Health Check*\n\nIf you see this, the bot's messaging system is ONLINE. Please ignore this test.",
      parse_mode: 'Markdown'
    });
    console.log(`Response Status: ${resp.status}`);
    console.log(`Response Data:`, resp.data);
  } catch (e) {
    console.error(`Send Message Fail: ${e.message}`);
    if (e.response) {
      console.log(`Response data:`, e.response.data);
    }
  }
}

sendTestMessage();
