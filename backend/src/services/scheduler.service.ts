import cron from 'node-cron';
import { getDatabase } from '../config/database';
import { getAllRepairs, getDisplayStatus } from '../config/access-reader';
import { notifyReminder3Days } from './notification.service';
import { logAction } from '../middleware/logger';
import { BackupService } from './backup.service';

/**
 * Scheduled Jobs Service — runs periodic tasks using node-cron.
 *
 * Jobs:
 * 1. Expire pending approvals (every hour)
 * 2. Clean expired sessions (every 6 hours)
 * 3. Remind customers about ready devices (daily at 10am)
 * 4. Clean expired share links (every 6 hours)
 * 5. Automated DB Backup (daily at 3am)
 */

export function startScheduledJobs(): void {
  console.log('⏰ Scheduled jobs initialized');

  // 1. Expire pending approvals (every hour, at minute 0)
  cron.schedule('0 * * * *', () => {
    expirePendingApprovals();
  });

  // 2. Clean expired sessions (every 6 hours)
  cron.schedule('0 */6 * * *', () => {
    cleanExpiredSessions();
  });

  // 3. Remind customers (daily at 10:00 AM Cairo time)
  cron.schedule('0 10 * * *', () => {
    sendReadyDeviceReminders();
  });

  // 4. Clean expired share links (every 6 hours)
  cron.schedule('0 */6 * * *', () => {
    cleanExpiredShareLinks();
  });

  // 5. Automated DB Backup (daily at 3:00 AM)
  cron.schedule('0 3 * * *', () => {
    BackupService.runBackup().catch(e => console.error('[Cron] Backup failed:', e));
  });
}

/**
 * Expire pending approvals older than 48 hours.
 */
function expirePendingApprovals(): void {
  try {
    const db = getDatabase();
    const result = db.prepare(
      `UPDATE cost_approvals
       SET status = 'expired'
       WHERE status = 'pending'
         AND created_at < datetime('now', '-48 hours')`
    ).run();

    if (result.changes > 0) {
      console.log(`[Cron] Expired ${result.changes} pending approvals`);
      logAction('system', 'cron', 'APPROVALS_EXPIRED', `${result.changes} approvals expired`);
    }
  } catch (err) {
    console.error('[Cron] Error expiring approvals:', (err as Error).message);
  }
}

/**
 * Clean expired sessions from the database.
 */
function cleanExpiredSessions(): void {
  try {
    const db = getDatabase();

    // Customer sessions
    const sessions = db.prepare(
      "DELETE FROM sessions WHERE expires_at < datetime('now')"
    ).run();

    // Admin sessions
    const adminSessions = db.prepare(
      "DELETE FROM admin_sessions WHERE expires_at < datetime('now')"
    ).run();

    // Expired 2FA codes
    const codes = db.prepare(
      "DELETE FROM admin_2fa_codes WHERE expires_at < datetime('now')"
    ).run();

    const total = sessions.changes + adminSessions.changes + codes.changes;
    if (total > 0) {
      console.log(`[Cron] Cleaned ${total} expired records (${sessions.changes} sessions, ${adminSessions.changes} admin sessions, ${codes.changes} 2FA codes)`);
      logAction('system', 'cron', 'SESSIONS_CLEANED', `${total} records`);
    }
  } catch (err) {
    console.error('[Cron] Error cleaning sessions:', (err as Error).message);
  }
}

/**
 * Send reminders for devices ready for pickup for more than 3 days.
 */
function sendReadyDeviceReminders(): void {
  try {
    const repairs = getAllRepairs();
    const readyDevices = repairs.filter(r => {
      const status = getDisplayStatus(r.rep_state2, r.rep_state);
      return status === 'جاهز للاستلام';
    });

    // Check each ready device against the device_events table
    const db = getDatabase();

    for (const device of readyDevices) {
      // Find when device became ready
      const readyEvent = db.prepare(
        `SELECT created_at FROM device_events
         WHERE device_code = ? AND event_type = 'STATUS_CHANGED' AND new_value = 'جاهز للاستلام'
         ORDER BY created_at DESC LIMIT 1`
      ).get(device.rep_code) as { created_at: string } | undefined;

      if (!readyEvent) continue;

      const readyDate = new Date(readyEvent.created_at);
      const daysSinceReady = Math.floor((Date.now() - readyDate.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder at exactly 3 days
      if (daysSinceReady === 3 && device.rep_tel) {
        notifyReminder3Days(device.rep_tel, { code: device.rep_code });
        console.log(`[Cron] Sent 3-day reminder for ${device.rep_code}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Error sending reminders:', (err as Error).message);
  }
}

/**
 * Clean expired share links.
 */
function cleanExpiredShareLinks(): void {
  try {
    const db = getDatabase();
    const result = db.prepare(
      "DELETE FROM share_links WHERE expires_at < datetime('now')"
    ).run();

    if (result.changes > 0) {
      console.log(`[Cron] Cleaned ${result.changes} expired share links`);
    }
  } catch (err) {
    console.error('[Cron] Error cleaning share links:', (err as Error).message);
  }
}
