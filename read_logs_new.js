import { getLiveBoardData } from './services/monitorService.js';

async function check() {
  const data = await getLiveBoardData();
  console.log(JSON.stringify(data.logs.slice(0, 5), null, 2));
}

check();
