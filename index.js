import express from 'express';
import handler from './api/telegram-webhook.js';
import monitorHandler from './api/monitor.js';
import config from './config/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import adminRouter from './api/admin.js';

const app = express();
app.use(express.json());

// Main webhook route
app.post('/api/telegram-webhook', handler);

// Monitor API
app.get('/api/monitor', monitorHandler);

// Admin API
app.use('/api/admin', adminRouter);

// Dashboard Frontend (React Build)
app.use(express.static('dashboard/dist'));
app.get('/admin/:any*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'dist', 'index.html'));
});

// Health check route
app.get('/', (req, res) => res.send(`MSAJCE Bot is running. Visit /dashboard for logistics.`));

// Start server (for local testing/Vercel)
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server launched on port ${PORT}`);
});

export default app;
