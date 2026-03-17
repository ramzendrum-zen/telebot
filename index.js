import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './api/telegram-webhook.js';
import monitorHandler from './api/monitor.js';
import adminRouter from './api/admin.js';
import config from './config/config.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API Routes
app.post('/api/telegram-webhook', handler);
app.get('/api/monitor', monitorHandler);
app.use('/api/admin', adminRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Dashboard Frontend Paths (React Build)
const publicPath = path.resolve(process.cwd(), 'dashboard', 'dist');
console.log(`[System] Serving React Dashboard from: ${publicPath}`);

// Serve static files from dashboard/dist
app.use(express.static(publicPath));

app.get('/dashboard', (req, res) => {
  const filePath = path.join(publicPath, 'index.html');
  if (fs.existsSync(filePath)) {
      res.sendFile('index.html', { root: publicPath });
  } else {
      res.status(404).send(`Dashboard build mission. Run 'npm run build' in /dashboard.`);
  }
});

// Root Redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`);
  res.status(500).send('Internal Server Error');
});

const PORT = config.port || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server launched on http://localhost:${PORT}`);
});

export default app;
