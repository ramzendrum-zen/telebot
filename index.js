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

// Dashboard Frontend (Modern Minimalist)
app.use('/dashboard', express.static(path.join(__dirname, 'public')));
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Root Redirect
app.get('/', (req, res) => {
  res.send(`
    <body style="font-family:Inter,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#fff">
        <div style="text-align:center">
            <h1 style="font-weight:600; font-size:18px; letter-spacing:-0.02em">MSAJCE TERMINAL</h1>
            <p style="color:#666; font-size:14px">Academic & Grievance Systems are Active.</p>
            <a href="/dashboard" style="color:#000; font-weight:600; text-decoration:none; border-bottom:1px solid #000; padding-bottom:2px">Access Fleet Dashboard</a>
        </div>
    </body>
  `);
});

// Start server (for local testing/Vercel)
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server launched on port ${PORT}`);
});

export default app;
