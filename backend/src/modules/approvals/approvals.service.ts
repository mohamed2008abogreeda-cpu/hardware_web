import { getDatabase } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import crypto from 'crypto';
import { trackEvent } from '../../services/analytics.service';

/**
 * Get approval status for a device.
 */
export function getApproval(deviceCode: string): Record<string, unknown> | null {
  const db = getDatabase();
  const approval = db.prepare(
    'SELECT * FROM cost_approvals WHERE device_code = ? ORDER BY created_at DESC LIMIT 1'
  ).get(deviceCode) as Record<string, unknown> | undefined;
  return approval || null;
}

/**
 * Create an approval request (called by watcher when status = 'انتظار موافقة').
 */
export function createApprovalRequest(deviceCode: string, amount: number): { token: string } {
  const db = getDatabase();

  db.prepare(
    'INSERT INTO cost_approvals (device_code, amount, status) VALUES (?, ?, ?)'
  ).run(deviceCode, amount, 'pending');

  // Create a unique token for the approval link
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48h

  db.prepare(
    'INSERT INTO share_links (token, device_code, expires_at) VALUES (?, ?, ?)'
  ).run(token, deviceCode, expiresAt);

  return { token };
}

/**
 * Submit approval response (approve or reject).
 */
export function respondToApproval(
  deviceCode: string,
  response: 'approved' | 'rejected',
  reason?: string
): void {
  const db = getDatabase();

  const approval = db.prepare(
    "SELECT id, status, amount FROM cost_approvals WHERE device_code = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  ).get(deviceCode) as { id: number; status: string, amount: number } | undefined;

  if (!approval) {
    throw new NotFoundError('لا يوجد طلب موافقة معلق');
  }

  db.prepare(
    'UPDATE cost_approvals SET status = ?, reason = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(response, reason || null, approval.id);

  // Update real status via device_overrides
  let newRepState = 'لم يتم التسليم';
  let newRepState2 = 'الرجوع للعميل';
  
  if (response === 'approved') {
    // If approved, put it directly back into repair
    newRepState2 = ''; // Means 'قيد الإصلاح' when state='لم يتم التسليم'
  } else {
    // If rejected, mark as unrepairable
    newRepState2 = 'لا تصلح';
  }

  db.prepare(
    `INSERT INTO device_overrides (rep_code, updated_state, updated_state2, updated_amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(rep_code) DO UPDATE SET
     updated_state = ?, updated_state2 = ?, updated_amount = ?`
  ).run(deviceCode, newRepState, newRepState2, approval.amount, newRepState, newRepState2, approval.amount);

  // Log the event
  db.prepare(
    'INSERT INTO device_events (device_code, event_type, new_value) VALUES (?, ?, ?)'
  ).run(deviceCode, `APPROVAL_${response.toUpperCase()}`, reason || '');

  trackEvent(deviceCode, 'APPROVAL_RESPONDED', { response, reason });
}

/**
 * Expire old pending approvals (called by scheduled job).
 */
export function expireOldApprovals(): number {
  const db = getDatabase();
  const result = db.prepare(
    `UPDATE cost_approvals
     SET status = 'expired'
     WHERE status = 'pending'
     AND created_at <= datetime('now', '-48 hours')`
  ).run();
  return result.changes;
}

/**
 * Verify an approval by token (share_links table).
 */
export function verifyApprovalToken(token: string): Record<string, unknown> | null {
  const db = getDatabase();

  const link = db.prepare(
    "SELECT device_code, expires_at FROM share_links WHERE token = ?"
  ).get(token) as { device_code: string; expires_at: string } | undefined;

  if (!link) return null;

  // Check expiry
  if (new Date(link.expires_at) < new Date()) {
    return { expired: true };
  }

  // Get the approval for this device
  const approval = db.prepare(
    'SELECT * FROM cost_approvals WHERE device_code = ? ORDER BY created_at DESC LIMIT 1'
  ).get(link.device_code) as Record<string, unknown> | undefined;

  return approval || null;
}

/**
 * Respond to an approval via token.
 */
export function respondByToken(
  token: string,
  response: 'approved' | 'rejected'
): { deviceCode: string } | null {
  const db = getDatabase();

  const link = db.prepare(
    "SELECT device_code, expires_at FROM share_links WHERE token = ?"
  ).get(token) as { device_code: string; expires_at: string } | undefined;

  if (!link) return null;
  if (new Date(link.expires_at) < new Date()) return null;

  respondToApproval(link.device_code, response);

  // Delete the link after use
  db.prepare('DELETE FROM share_links WHERE token = ?').run(token);

  return { deviceCode: link.device_code };
}
