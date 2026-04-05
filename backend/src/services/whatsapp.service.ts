import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { env } from '../config/env';
import { SettingsModel } from '../models/settings.model';
import { getRepairsByPhone, getRepairByCode } from '../config/access-reader';
import { sendCustomerMessage, sendSupportMessage } from '../modules/chat/chat.service';

let client: Client | null = null;
let isReady = false;
let lastQrDataUrl: string | null = null;
let connectionStatus: 'disconnected' | 'connecting' | 'qr_pending' | 'authenticated' | 'ready' = 'disconnected';
let lastError: string | null = null;
let ioInstance: any = null;

export function setWhatsAppIO(io: any) {
  ioInstance = io;
}

export async function initializeWhatsApp(): Promise<void> {
  const enabled = SettingsModel.getBoolean('whatsapp_enabled', env.WHATSAPP_ENABLED);
  if (!enabled) {
    connectionStatus = 'disconnected';
    console.log('[WhatsApp] Disabled by configuration.');
    return;
  }

  connectionStatus = 'connecting';
  lastQrDataUrl = null;
  lastError = null;
  console.log('[WhatsApp] Initializing...');

  const sessionPath = SettingsModel.get('whatsapp_session_path') || env.WHATSAPP_SESSION_PATH || './data/whatsapp-session';
  const waVersionUrl = SettingsModel.get('whatsapp_version_url') || 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html';

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
    webVersionCache: {
      type: 'remote',
      remotePath: waVersionUrl,
    },
  });

  client.on('qr', async (qr) => {
    connectionStatus = 'qr_pending';
    console.log('\n[WhatsApp] 📱 QR code generated — scan it from the admin panel or terminal:');
    try {
      // Generate terminal QR
      const terminalQr = await qrcode.toString(qr, { type: 'terminal', small: true });
      console.log(terminalQr);

      // Generate base64 data URL for admin panel
      lastQrDataUrl = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
    } catch (err) {
      console.error('[WhatsApp] Failed to generate QR code', err);
    }
  });

  client.on('ready', () => {
    isReady = true;
    connectionStatus = 'ready';
    lastQrDataUrl = null; // No longer needed
    lastError = null;
    console.log('✅ [WhatsApp] Client is ready and connected!');
  });

  client.on('message', async (msg) => {
    try {
      const from = msg.from; // e.g. "201012345678@c.us"
      if (!from.endsWith('@c.us')) return; // Ignore groups and other types

      const body = msg.body.trim();
      if (!body) return;

      // Extract local phone number from 'from'
      // E.g. "201012345678" -> "01012345678"
      let phone = from.split('@')[0];
      if (phone.startsWith('201')) {
        phone = '0' + phone.substring(2);
      } else if (phone.startsWith('1')) {
        phone = '0' + phone; 
      }

      // Check if user exists in our Access DB
      const repairs = getRepairsByPhone(phone);
      
      if (repairs.length === 0) {
        // No active devices, send instruction
        const isDeviceCode = /^[a-zA-Z]{1,2}-\d{4}$/.test(body.toUpperCase()); // e.g. AA-0001
        if (isDeviceCode) {
           const repair = getRepairByCode(body.toUpperCase());
           if (repair) {
             // Found via explicit code
             const saved = sendCustomerMessage(repair.rep_code, `(تسجيل من رقم مختلف: ${phone})\n${body}`);
             if (ioInstance) {
               ioInstance.to('admin').emit('admin:chat:newMessage', { ...saved, deviceCode: repair.rep_code });
             }
             msg.reply('تم العثور على الجهاز وتم إرسال رسالتك لمركز الدعم.');
           } else {
             msg.reply('عفواً، لا يوجد جهاز بهذا الكود.');
           }
        } else {
          msg.reply('عفواً، لم نتمكن من العثور على أجهزة مسجلة برقمك الحالى. يرجى إرسال *كود الجهاز* (مثال: AA-0001) إذا كان جهازك مسجلاً برقم آخر.');
        }
        return;
      }

      // Sort to get the most recent or active repair
      // Assuming rep_date1 is YYYY/MM/DD
      repairs.sort((a, b) => (b.rep_date1 || '').localeCompare(a.rep_date1 || ''));
      const activeRepair = repairs.find(r => r.rep_state === 'لم يتم التسليم') || repairs[0];

      const deviceCode = activeRepair.rep_code;
      const saved = sendCustomerMessage(deviceCode, body);

      // Tell admin
      if (ioInstance) {
        ioInstance.to('admin').emit('admin:chat:newMessage', { ...saved, deviceCode });
      }

      // We only auto-reply to their first message if they are asking common questions.
      // chat.service.ts already has detectAutoReply logic but it's used inside HTTP route.
      // We can implement it here.
      const lower = body.toLowerCase();
      let botResponse = null;
      if (lower.includes('فين جهازي') || lower.includes('وين جهازي') || lower.includes('where') || lower.includes('حالة الجهاز')) {
        botResponse = 'سنتحقق من حالة جهازك وإبلاغك فوراً 🔍';
      } else if (lower.includes('امتى يخلص') || lower.includes('متى') || lower.includes('when')) {
         botResponse = 'سنوافيك بالتحديث قريباً من قبل الفني المختص. شكراً لصبرك 🙏';
      }

      if (botResponse) {
         sendSupportMessage(deviceCode, botResponse);
         msg.reply(botResponse);
         if (ioInstance) {
           ioInstance.to('admin').emit('admin:chat:newMessage', {
             device_code: deviceCode,
             sender_type: 'support',
             message: botResponse,
             timestamp: new Date().toISOString(),
             is_read: 0,
             conversation_id: saved.conversation_id, // reuse conversation
             deviceCode: deviceCode
           });
         }
      }
    } catch (err) {
      console.error('[WhatsApp] Error handling incoming message:', err);
    }
  });

  client.on('authenticated', () => {
    connectionStatus = 'authenticated';
    lastQrDataUrl = null;
    console.log('[WhatsApp] Session authenticated.');
  });

  client.on('auth_failure', (msg) => {
    connectionStatus = 'disconnected';
    lastError = `Authentication failure: ${msg}`;
    console.error('❌ [WhatsApp] Authentication failure:', msg);
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    connectionStatus = 'disconnected';
    lastError = `Disconnected: ${reason}`;
    console.error('⚠️ [WhatsApp] Client disconnected:', reason);

    const autoReconnect = SettingsModel.getBoolean('whatsapp_auto_reconnect', true);
    if (autoReconnect) {
      const delay = SettingsModel.getNumber('whatsapp_reconnect_delay_ms', 5000);
      setTimeout(() => {
        console.log('[WhatsApp] Attempting to reconnect...');
        connectionStatus = 'connecting';
        client?.initialize().catch(console.error);
      }, delay);
    }
  });

  try {
    await client.initialize();
  } catch (error) {
    connectionStatus = 'disconnected';
    lastError = `Failed to initialize: ${(error as Error).message}`;
    console.error('❌ [WhatsApp] Failed to initialize:', error);
  }
}

/**
 * Get current WhatsApp connection status + QR code
 */
export function getWhatsAppStatus() {
  return {
    enabled: SettingsModel.getBoolean('whatsapp_enabled', env.WHATSAPP_ENABLED),
    status: connectionStatus,
    isReady,
    qrDataUrl: lastQrDataUrl,
    lastError,
  };
}

/**
 * Restart WhatsApp client (callable from admin panel)
 */
export async function restartWhatsApp(): Promise<void> {
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      console.error('[WhatsApp] Error destroying old client:', e);
    }
    client = null;
    isReady = false;
    connectionStatus = 'disconnected';
    lastQrDataUrl = null;
    lastError = null;
  }
  await initializeWhatsApp();
}

/**
 * Format local phone number to WhatsApp international format (c.us)
 */
function formatPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  const countryCode = SettingsModel.get('whatsapp_default_country_code') || '20';
  if (clean.length === 11 && clean.startsWith('01')) {
    clean = countryCode + clean.substring(1);
  } else if (clean.length === 10 && clean.startsWith('1')) {
    clean = countryCode + clean;
  }
  return `${clean}@c.us`;
}

/**
 * Send a WhatsApp text message.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const enabled = SettingsModel.getBoolean('whatsapp_enabled', env.WHATSAPP_ENABLED);
  if (!client || !isReady || !enabled) {
    if (enabled) {
      console.warn(`[WhatsApp] Cannot send message to ${phone}. Client not ready.`);
    }
    return false;
  }

  try {
    const formatted = formatPhone(phone);
    await client.sendMessage(formatted, message);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Failed sending to ${phone}:`, error);
    return false;
  }
}
