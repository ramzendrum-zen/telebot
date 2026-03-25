import axios from 'axios';

const WEBHOOK_URL = 'https://msajce-bot.vercel.app/api/telegram-webhook';

async function testWebhook() {
  const payload = {
    message: {
      from: { first_name: 'Antigravity' },
      chat: { id: 12345 },
      text: 'What are the bus routes?'
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
