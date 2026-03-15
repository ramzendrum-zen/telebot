import { getLiveBoardData } from '../services/monitorService.js';

export default async function handler(req, res) {
  const data = await getLiveBoardData();
  res.status(200).json(data);
}
