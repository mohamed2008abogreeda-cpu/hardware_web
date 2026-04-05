import {
  getRepairByCode,
  getRepairsByPhone,
  filterForCustomer,
} from '../../config/access-reader';
import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import crypto from 'crypto';

/**
 * Get all devices for a customer phone number.
 */
export function getDevicesByPhone(phone: string): Record<string, unknown>[] {
  const repairs = getRepairsByPhone(phone);
  return repairs.map(filterForCustomer);
}

/**
 * Get a single device by code (customer-safe fields only).
 */
export function getDeviceByCode(code: string): Record<string, unknown> {
  const repair = getRepairByCode(code);
  if (!repair) {
    throw new NotFoundError('الجهاز غير موجود');
  }
  return filterForCustomer(repair);
}

/**
 * Create a temporary share link for a device.
 */
export function createShareLink(deviceCode: string): { token: string; expiresAt: string } {
  // Verify device exists
  const repair = getRepairByCode(deviceCode);
  if (!repair) {
    throw new NotFoundError('الجهاز غير موجود');
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  const db = getDatabase();
  db.prepare(
    'INSERT OR REPLACE INTO share_links (token, device_code, expires_at) VALUES (?, ?, ?)'
  ).run(token, deviceCode, expiresAt);

  return { token, expiresAt };
}

/**
 * Get device by share token (no auth required).
 */
export function getDeviceByShareToken(token: string): Record<string, unknown> {
  const db = getDatabase();
  const link = db.prepare(
    'SELECT device_code, expires_at FROM share_links WHERE token = ?'
  ).get(token) as { device_code: string; expires_at: string } | undefined;

  if (!link) {
    throw new NotFoundError('رابط غير صالح');
  }

  if (new Date(link.expires_at) < new Date()) {
    db.prepare('DELETE FROM share_links WHERE token = ?').run(token);
    throw new NotFoundError('انتهت صلاحية الرابط');
  }

  return getDeviceByCode(link.device_code);
}

/**
 * Record "I'm on my way" notification.
 */
export function notifyOnMyWay(deviceCode: string): void {
  const repair = getRepairByCode(deviceCode);
  if (!repair) {
    throw new NotFoundError('الجهاز غير موجود');
  }

  const db = getDatabase();
  db.prepare(
    'INSERT INTO device_events (device_code, event_type, new_value) VALUES (?, ?, ?)'
  ).run(deviceCode, 'CLIENT_ENROUTE', new Date().toISOString());
}
