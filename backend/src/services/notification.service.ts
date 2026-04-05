import { getDatabase } from '../config/database';
import { sendWhatsAppMessage } from './whatsapp.service';

/**
 * Notification Service — sends messages to customers via templates.
 *
 * Supports WhatsApp, SMS, and email channels.
 * Templates are stored in the notification_templates table.
 * Currently logs notifications; actual integrations (WhatsApp, SMS) are pluggable.
 */

export interface NotificationPayload {
  phone: string;
  eventType: string;
  data: Record<string, string | number>;
}

type Channel = 'whatsapp' | 'sms' | 'email';

/**
 * Send a notification using the configured template.
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const { phone, eventType, data } = payload;
  const db = getDatabase();

  // Fetch template
  const template = db.prepare(
    'SELECT template, enabled, channels FROM notification_templates WHERE event_type = ?'
  ).get(eventType) as { template: string; enabled: number; channels: string } | undefined;

  if (!template || !template.enabled) {
    console.log(`[Notification] Template "${eventType}" not found or disabled`);
    return false;
  }

  // Render template — replace {{key}} with data values
  const message = renderTemplate(template.template, data);
  const channels = template.channels.split(',').map(c => c.trim()) as Channel[];

  // Send via each channel
  for (const channel of channels) {
    try {
      await sendViaChannel(channel, phone, message);
      logNotification(phone, eventType, channel, message, true);
    } catch (err) {
      const error = err as Error;
      console.error(`[Notification] Failed to send via ${channel}:`, error.message);
      logNotification(phone, eventType, channel, message, false, error.message);
    }
  }

  return true;
}

/**
 * Render a template string, replacing {{key}} with data values.
 */
function renderTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return String(data[key] ?? `{{${key}}}`);
  });
}

/**
 * Send message via a specific channel.
 */
async function sendViaChannel(channel: Channel, phone: string, message: string): Promise<void> {
  switch (channel) {
    case 'whatsapp':
      await sendWhatsApp(phone, message);
      break;
    case 'sms':
      await sendSMS(phone, message);
      break;
    case 'email':
      await sendEmail(phone, message);
      break;
  }
}

/**
 * WhatsApp sender
 */
async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const sent = await sendWhatsAppMessage(phone, message);
  if (!sent) {
    // Only log if WhatsApp integration isn't active or failed
    console.log(`[WhatsApp-Fallback] → ${phone}: ${message.substring(0, 60)}...`);
  }
}

/**
 * SMS sender (placeholder — integrate with GSM modem or API).
 */
async function sendSMS(phone: string, message: string): Promise<void> {
  // TODO: Integrate with gammu/GSM modem or SMS API
  console.log(`[SMS] → ${phone}: ${message.substring(0, 60)}...`);
}

/**
 * Email sender (placeholder — integrate with nodemailer).
 */
async function sendEmail(_phone: string, message: string): Promise<void> {
  // TODO: Integrate with nodemailer
  console.log(`[Email] → ${message.substring(0, 60)}...`);
}

/**
 * Log notification to system_logs.
 */
function logNotification(
  phone: string,
  eventType: string,
  channel: Channel,
  message: string,
  success: boolean,
  error?: string
): void {
  const db = getDatabase();
  db.prepare(
    'INSERT INTO system_logs (user_type, user_id, action, details) VALUES (?, ?, ?, ?)'
  ).run(
    'system',
    phone,
    `NOTIFICATION_${success ? 'SENT' : 'FAILED'}`,
    JSON.stringify({ eventType, channel, message: message.substring(0, 100), error })
  );
}

// ============================================
// Convenience Notification Functions
// ============================================

/**
 * Notify customer about a new device being registered.
 */
export async function notifyNewDevice(phone: string, data: { name: string; device: string; code: string; link: string }): Promise<void> {
  await sendNotification({ phone, eventType: 'new_device', data });
}

/**
 * Notify customer about a status change.
 */
export async function notifyStatusChange(phone: string, data: { code: string; status: string }): Promise<void> {
  await sendNotification({ phone, eventType: 'status_change', data });
}

/**
 * Notify customer that the device is ready for pickup.
 */
export async function notifyDeviceReady(phone: string, data: { code: string; amount: number }): Promise<void> {
  await sendNotification({ phone, eventType: 'device_ready', data: { ...data, amount: String(data.amount) } });
}

/**
 * Notify customer about a cost approval request.
 */
export async function notifyApprovalRequest(phone: string, data: { amount: number; code: string; link: string }): Promise<void> {
  await sendNotification({ phone, eventType: 'approval_request', data: { ...data, amount: String(data.amount) } });
}

/**
 * Notify customer about a chat reply.
 */
export async function notifyChatReply(phone: string, data: { preview: string; link: string }): Promise<void> {
  await sendNotification({ phone, eventType: 'chat_reply', data });
}

/**
 * Send a 3-day reminder for uncollected devices.
 */
export async function notifyReminder3Days(phone: string, data: { code: string }): Promise<void> {
  await sendNotification({ phone, eventType: 'reminder_3days', data });
}

/**
 * Alert admin about a bad rating.
 */
export async function notifyBadRating(adminPhone: string, data: { name: string; code: string; comment: string }): Promise<void> {
  await sendNotification({ phone: adminPhone, eventType: 'bad_rating', data });
}
