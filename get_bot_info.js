import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = '8187410449:AAGYTg4u75y5BSeWkkBubH7nslJMGmTEoGU';

async function getBotInfo() {
  try {
    const resp = await axios.get(`https://api.telegram.org/bot${TOKEN}/getMe`);
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

getBotInfo();
