import express from 'express';
import { createServer } from 'http';
import nodePath from 'path';

// Simplified imports for debugging
import authRoutes from './modules/auth/auth.routes';
import deviceRoutes from './modules/devices/devices.routes';
import chatRoutes from './modules/chat/chat.routes';
import pushRoutes from './modules/push/push.routes';
import approvalRoutes from './modules/approvals/approvals.routes';
import ratingRoutes from './modules/ratings/ratings.routes';
import adminRoutes from './modules/admin/admin.routes';
import qrRoutes from './modules/qr/qr.routes';

const app = express();

console.log('--- Debug Route Registration ---');

const testRoute = (name: string, path: string, handler: any) => {
  try {
    console.log(`Checking ${name}... handler type: ${typeof handler}`);
    if (typeof handler !== 'function' && typeof handler !== 'object') {
       console.error(`CRITICAL: ${name} is invalid!`);
    }
    app.use(path, handler);
    console.log(`✓ ${name} registered on ${path}`);
  } catch (e: any) {
    console.error(`✗ FAILED to register ${name}:`, e.message);
    console.error(e.stack);
  }
};

testRoute('auth', '/api/auth', authRoutes);
testRoute('devices', '/api/devices', deviceRoutes);
testRoute('chat', '/api/chat', chatRoutes);
testRoute('approvals', '/api/approvals', approvalRoutes);
testRoute('ratings', '/api/ratings', ratingRoutes);
testRoute('admin', '/api/admin', adminRoutes);
testRoute('qr', '/api/qr', qrRoutes);
testRoute('push', '/api/push', pushRoutes);

console.log('--- End Debug ---');

const httpServer = createServer(app);
httpServer.listen(3001, () => {
  console.log('Debug server listening on 3001');
  process.exit(0);
});
