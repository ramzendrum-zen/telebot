import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WEBHOOK_URL = 'http://localhost:8080/api/telegram-webhook';

async function testWebhook() {
  const payload = {
    message: {
      from: { first_name: 'Antigravity' },
      chat: { id: 7770158141 },
      text: '/start'
    }
  };

  try {
    console.log(`Sending query to ${WEBHOOK_URL}...`);
    const resp = await axios.post(WEBHOOK_URL, payload);
    console.log(`Response Status: ${resp.status}`);
    console.log(`Response Data:`, resp.data);
  } catch (e) {
    console.error(`Webhook call failed: ${e.message}`);
    if (e.response) {
      console.log(`Response data:`, e.response.data);
    }
  }
}

testWebhook();
