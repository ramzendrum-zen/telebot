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

// Dashboard Frontend Paths
const publicPath = path.resolve(process.cwd(), 'public');
console.log(`[System] Static Assets Root: ${publicPath}`);

// Serve static files from public
app.use(express.static(publicPath));

app.get('/dashboard', (req, res) => {
  const filePath = path.join(publicPath, 'dashboard.html');
  if (fs.existsSync(filePath)) {
      // Use root option for reliable absolute path sending in Express
      res.sendFile('dashboard.html', { root: publicPath });
  } else {
      res.status(404).send(`Dashboard file missing at: ${filePath}`);
  }
});

// Root Redirect
app.get('/', (req, res) => {
  res.send(`
    <body style="font-family:Inter,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#fff">
        <div style="text-align:center">
            <h1 style="font-weight:600; font-size:18px; letter-spacing:-0.02em">MSAJCE TERMINAL</h1>
            <p style="color:#666; font-size:14px">Academic & Grievance Systems are Active.</p>
            <a href="/dashboard" style="color:#2563eb; font-weight:600; text-decoration:none; border-bottom:1px solid #2563eb; padding-bottom:2px">Access Fleet Dashboard</a>
        </div>
    </body>
  `);
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
