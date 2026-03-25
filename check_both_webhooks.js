import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function checkBothWebhooks() {
  const bots = [
    { name: 'Assistant', token: '8187410449:AAGYTg4u75y5BSeWkkBubH7nslJMGmTEoGU' },
    { name: 'Grievance', token: '8185920704:AAG80BofO3GF5bI_8v-C3Z32ThN8a4wYHXU' }
  ];

  for (const bot of bots) {
    try {
      const resp = await axios.get(`https://api.telegram.org/bot${bot.token}/getWebhookInfo`);
      console.log(`--- ${bot.name} Bot Webhook ---`);
      console.log(JSON.stringify(resp.data.result, null, 2));
    } catch (e) {
      console.error(`Error checking ${bot.name} bot: ${e.message}`);
    }
  }
}

checkBothWebhooks();
