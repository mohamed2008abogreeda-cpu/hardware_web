import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import crypto from 'crypto';
import type { ChatMessage } from '../../types';
import { trackEvent } from '../../services/analytics.service';

/**
 * Get messages for a device code.
 */
export function getMessages(deviceCode: string): ChatMessage[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT id, device_code, sender_type, message, timestamp, is_read, conversation_id, file_url, file_type, file_size
     FROM chat_messages
     WHERE device_code = ?
     ORDER BY timestamp ASC`
  ).all(deviceCode) as ChatMessage[];
}

/**
 * Send a message from a customer.
 */
export function sendCustomerMessage(
  deviceCode: string,
  message: string,
  file?: { url: string; type: string; size: number }
): ChatMessage {
  const db = getDatabase();

  // Get or create conversation ID
  const existing = db.prepare(
    'SELECT conversation_id FROM chat_messages WHERE device_code = ? AND conversation_id IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
  ).get(deviceCode) as { conversation_id: string } | undefined;

  const conversationId = existing?.conversation_id || `conv-${crypto.randomBytes(6).toString('hex')}`;

  const result = db.prepare(
    `INSERT INTO chat_messages (device_code, sender_type, message, conversation_id, file_url, file_type, file_size)
     VALUES (?, 'customer', ?, ?, ?, ?, ?)`
  ).run(deviceCode, message, conversationId, file?.url || null, file?.type || null, file?.size || null);

  trackEvent(deviceCode, 'CHAT_MESSAGE_SENT', { sender: 'customer', length: message.length });

  return {
    id: Number(result.lastInsertRowid),
    device_code: deviceCode,
    sender_type: 'customer',
    message,
    timestamp: new Date().toISOString(),
    is_read: 0,
    conversation_id: conversationId,
    file_url: file?.url,
    file_type: file?.type,
    file_size: file?.size,
  };
}

/**
 * Send a message from support (admin).
 */
export function sendSupportMessage(
  deviceCode: string,
  message: string,
  file?: { url: string; type: string; size: number }
): ChatMessage {
  const db = getDatabase();

  const existing = db.prepare(
    'SELECT conversation_id FROM chat_messages WHERE device_code = ? AND conversation_id IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
  ).get(deviceCode) as { conversation_id: string } | undefined;

  if (!existing) {
    throw new NotFoundError('لا توجد محادثة لهذا الجهاز');
  }

  const result = db.prepare(
    `INSERT INTO chat_messages (device_code, sender_type, message, conversation_id, file_url, file_type, file_size)
     VALUES (?, 'support', ?, ?, ?, ?, ?)`
  ).run(deviceCode, message, existing.conversation_id, file?.url || null, file?.type || null, file?.size || null);

  trackEvent('admin', 'SUPPORT_MESSAGE_SENT', { deviceCode, length: message.length });

  return {
    id: Number(result.lastInsertRowid),
    device_code: deviceCode,
    sender_type: 'support',
    message,
    timestamp: new Date().toISOString(),
    is_read: 0,
    conversation_id: existing.conversation_id,
    file_url: file?.url,
    file_type: file?.type,
    file_size: file?.size,
  };
}

/**
 * Close a chat conversation.
 */
export function closeChat(deviceCode: string): void {
  const db = getDatabase();
  db.prepare(
    'UPDATE chat_messages SET is_read = 1 WHERE device_code = ? AND is_read = 0'
  ).run(deviceCode);
}

/**
 * Auto-reply to common queries.
 */
export function detectAutoReply(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes('فين جهازي') || lower.includes('وين جهازي') || lower.includes('where')) {
    return 'سنتحقق من حالة جهازك وإبلاغك فوراً 🔍';
  }
  if (lower.includes('امتى يخلص') || lower.includes('متى') || lower.includes('when')) {
    return 'سنوافيك بالتحديث قريباً. شكراً لصبرك 🙏';
  }

  return null;
}

/**
 * Get all conversations for admin.
 */
export function getAllConversations(): Record<string, unknown>[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT
       conversation_id,
       device_code,
       MAX(timestamp) as last_message_at,
       COUNT(*) as message_count,
       SUM(CASE WHEN is_read = 0 AND sender_type = 'customer' THEN 1 ELSE 0 END) as unread_count,
       (SELECT message FROM chat_messages cm2
        WHERE cm2.conversation_id = cm.conversation_id
        ORDER BY timestamp DESC LIMIT 1) as last_message
     FROM chat_messages cm
     WHERE conversation_id IS NOT NULL
     GROUP BY conversation_id
     ORDER BY last_message_at DESC`
  ).all() as Record<string, unknown>[];
}
