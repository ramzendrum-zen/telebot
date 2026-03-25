import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = '8185920704:AAG80BofO3GF5bI_8v-C3Z32ThN8a4wYHXU';

async function getBotWebhookInfo() {
  try {
    const resp = await axios.get(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

getBotWebhookInfo();
