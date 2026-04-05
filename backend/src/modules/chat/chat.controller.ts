import { Request, Response } from 'express';
import * as chatService from './chat.service';
import { PushService } from '../../services/push.service';
import { ValidationError, NotFoundError } from '../../utils/errors';

/**
 * GET /api/chat/:deviceCode/messages
 */
export function handleGetMessages(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  const messages = chatService.getMessages(deviceCode);
  res.json({ success: true, data: messages });
}

/**
 * POST /api/chat/:deviceCode/messages
 */
export function handleSendMessage(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  const { message } = req.body;
  if ((!message || typeof message !== 'string' || message.trim().length === 0) && !req.file) {
    res.status(400).json({ success: false, error: 'الرسالة أو المرفق مطلوب', code: 400 });
    return;
  }

  // Sanitize
  const sanitized = message ? message.trim().replace(/[<>]/g, '') : '';

  // Determine sender type based on role
  let saved;
  const io = req.app.get('io');
  const role = req.user?.role;

  const fileData = req.file ? {
    url: `/uploads/chat/${req.file.filename}`,
    type: req.file.mimetype,
    size: req.file.size
  } : undefined;

  if (role === 'admin' || role === 'tech') {
    // Admin/Support/Tech sending a message
    saved = chatService.sendSupportMessage(deviceCode, sanitized, fileData);
    
    // Notify customer
    if (io) {
      io.to(`device:${deviceCode}`).emit('server:chat:message', saved);
      // Also broadcast to other admins so they see the reply
      io.to('admin').emit('admin:chat:newMessage', { ...saved, deviceCode });
    }

    // WEB PUSH: Notify customer
    try {
      const { getRepairByCode } = require('../../config/access-reader');
      const device = getRepairByCode(deviceCode);
      if (device && device.rep_tel) {
        PushService.sendNotification('customer', device.rep_tel, {
          title: 'رد جديد من الدعم الفني',
          body: sanitized || 'استلمت صورة/ملف جديد',
          icon: '/logo.png',
          url: `/device/${deviceCode}/chat`
        }).catch(e => console.error('[Push] Failed to notify customer:', e));
      }
    } catch (e) {
      console.error('[Push] Phone lookup failed:', e);
    }
  } else {
    // Customer sending a message
    saved = chatService.sendCustomerMessage(deviceCode, sanitized, fileData);
    
    // Notify admin
    if (io) {
      io.to('admin').emit('admin:chat:newMessage', { ...saved, deviceCode });
    }

    // WEB PUSH: Notify all admins
    PushService.sendNotification('admin', 'admin', { // UserID 'admin' for now or broadcast
      title: `رسالة جديدة: ${deviceCode}`,
      body: sanitized || 'أرسل العميل صورة/ملف',
      icon: '/logo.png',
      url: '/admin/chat'
    }).catch(e => console.error('[Push] Failed to notify admins:', e));

    // Check for auto-reply (only if no file?)
    if (!fileData) {
      const autoReply = chatService.detectAutoReply(sanitized);
      if (autoReply) {
        const botMsg = chatService.sendSupportMessage(deviceCode, autoReply);
        if (io) {
          io.to(`device:${deviceCode}`).emit('server:chat:message', botMsg);
          io.to('admin').emit('admin:chat:newMessage', { ...botMsg, deviceCode });
        }
      }
    }
  }

  res.json({ success: true, data: saved });
}

/**
 * POST /api/chat/:deviceCode/close
 */
export function handleCloseChat(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  chatService.closeChat(deviceCode);
  res.json({ success: true, data: { message: 'تم إغلاق المحادثة' } });
}
