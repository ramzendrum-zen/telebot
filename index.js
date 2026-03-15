import express from 'express';
import handler from './api/telegram-webhook.js';
import monitorHandler from './api/monitor.js';
import config from './config/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Main webhook route
app.post('/api/telegram-webhook', handler);

// Monitor API
app.get('/api/monitor', monitorHandler);

// Dashboard Frontend
app.use(express.static('public'));
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check route
app.get('/', (req, res) => res.send(`MSAJCE Bot is running. Visit /dashboard for logistics.`));

// Start server (for local testing/Vercel)
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server launched on port ${PORT}`);
});

export default app;
