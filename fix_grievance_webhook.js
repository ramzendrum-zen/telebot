import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GRIEVANCE_TOKEN = '8185920704:AAG80BofO3GF5bI_8v-C3Z32ThN8a4wYHXU';
const CORRECT_URL = 'https://msajce-bot.vercel.app/api/complaint-webhook';

async function fixGrievanceWebhook() {
  try {
    console.log(`Setting Grievance Bot webhook to: ${CORRECT_URL}`);
    const resp = await axios.post(`https://api.telegram.org/bot${GRIEVANCE_TOKEN}/setWebhook`, {
      url: CORRECT_URL,
      max_connections: 40,
      drop_pending_updates: true
    });
    console.log(`Response Status: ${resp.status}`);
    console.log(`Response Data:`, resp.data);
  } catch (e) {
    console.error(`Fix failed: ${e.message}`);
    if (e.response) {
      console.log(`Response data:`, e.response.data);
    }
  }
}

fixGrievanceWebhook();
