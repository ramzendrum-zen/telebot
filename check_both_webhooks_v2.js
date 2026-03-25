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
      const result = resp.data.result;
      console.log(`--- ${bot.name} Bot Webhook ---`);
      console.log(`URL: ${result.url}`);
      console.log(`Pending Updates: ${result.pending_update_count}`);
      console.log(`Last Error: ${result.last_error_message || 'None'}`);
      console.log(`Last Error Date: ${result.last_error_date ? new Date(result.last_error_date * 1000).toISOString() : 'N/A'}`);
    } catch (e) {
      console.error(`Error checking ${bot.name} bot: ${e.message}`);
    }
  }
}

checkBothWebhooks();
