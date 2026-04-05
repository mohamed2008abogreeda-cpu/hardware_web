// @ts-nocheck
const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const nodePath = require('path');

const { env } = require('./config/env');
const { runMigrations } = require('./config/database');
const { errorHandler } = require('./middleware/error-handler');
const { requestLogger } = require('./middleware/logger');
const { generalLimiter } = require('./middleware/rate-limiter');

// Routes
const authRoutes = require('./modules/auth/auth.routes').default;
const { adminAuthRouter } = require('./modules/auth/auth.routes');
const deviceRoutes = require('./modules/devices/devices.routes').default;
const { shareRouter } = require('./modules/devices/devices.routes');
const chatRoutes = require('./modules/chat/chat.routes').default;
const pushRoutes = require('./modules/push/push.routes').default;
const approvalRoutes = require('./modules/approvals/approvals.routes').default;
const ratingRoutes = require('./modules/ratings/ratings.routes').default;
const adminRoutes = require('./modules/admin/admin.routes').default;
const qrRoutes = require('./modules/qr/qr.routes').default;

const { startPolling } = require('./services/polling.service');
const { startScheduledJobs } = require('./services/scheduler.service');
const { initializeWhatsApp } = require('./services/whatsapp.service');

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: env.FRONTEND_URL, credentials: true }
});

app.set('io', io);
app.use(require('helmet')({ contentSecurityPolicy: false }));
app.use(require('cors')({
  origin: [env.FRONTEND_URL, /trycloudflare\.com$/],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(require('cookie-parser')());
app.use(requestLogger);
app.use(generalLimiter);

// Testing a very simple health check
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

// Helper to register safely
const safeUse = (path, router) => {
  try {
    if (router) app.use(path, router);
  } catch (e) {
    console.error(`Failed to register ${path}:`, e.message);
  }
};

safeUse('/api/auth', authRoutes);
safeUse('/api/admin/auth', adminAuthRouter);
safeUse('/api/admin', adminRoutes);
safeUse('/api/devices', deviceRoutes);
safeUse('/api/chat', chatRoutes);
safeUse('/api/approvals', approvalRoutes);
safeUse('/api/ratings', ratingRoutes);
safeUse('/api/share', shareRouter);
safeUse('/api/qr', qrRoutes);
safeUse('/api/push', pushRoutes);

const uploadsPath = nodePath.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

const frontendDistPath = nodePath.resolve(process.cwd(), '../frontend/dist');
app.use(express.static(frontendDistPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// USE REGEX FOR CATCH-ALL TO AVOID path-to-regexp issues in Express 5
// This matches everything that DOES NOT start with /api or /uploads
app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(nodePath.join(frontendDistPath, 'index.html'), (err) => {
    if (err && !res.headersSent) res.status(404).send('SPA Home');
  });
});

app.use(errorHandler);

async function start() {
  try {
    httpServer.listen(env.PORT, () => {
      console.log(`[Server] Stable at http://localhost:${env.PORT}`);
      
      // Post-startup background tasks
      setImmediate(() => {
        try {
          console.log('[Server] Running migrations...');
          runMigrations();
          console.log('[Server] Starting background services...');
          startPolling(io);
          startScheduledJobs();
          initializeWhatsApp().catch(err => console.error('[WhatsApp] Init failed:', err));
        } catch (err) {
          console.error('[Server] Background task error:', err);
        }
      });
    });
  } catch (err) {
    console.error('[Server] Fatal:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, io };
