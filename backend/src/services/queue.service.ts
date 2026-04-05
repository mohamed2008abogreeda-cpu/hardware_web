import Queue from 'bull';
import { env } from '../config/env';
import { sendNotification, type NotificationPayload } from './notification.service';
import { getDatabase } from '../config/database';

// Initialize Bull Queue backed by Redis
export const notificationQueue = new Queue<NotificationPayload>('notifications', env.REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5 * 60 * 1000, // 5 minutes retry delay
    },
    removeOnComplete: true,
  },
});

/**
 * Process notification jobs
 */
notificationQueue.process(async (job) => {
  console.log(`[Queue] Processing notification job ${job.id} for ${job.data.phone}`);
  try {
    const success = await sendNotification(job.data);
    if (!success) {
       // If no error was thrown but sending failed, we might want to manually retry or log
       console.log(`[Queue] Notification job ${job.id} completed but marked as not sent.`);
    }
  } catch (err) {
    console.error(`[Queue] Notification job ${job.id} failed:`, err);
    throw err; // Trigger Bull's retry mechanism
  }
});

// Event listeners for Queue
notificationQueue.on('failed', (job, err) => {
  const db = getDatabase();
  console.error(`[Queue] Job ${job.id} definitely failed after retries:`, err);
  if (job) {
    try {
        db.prepare(
            'INSERT INTO system_logs (user_type, user_id, action, details) VALUES (?, ?, ?, ?)'
        ).run(
            'system',
            job.data.phone,
            'QUEUE_JOB_FAILED',
            JSON.stringify({ error: err.message, jobData: job.data })
        );
    } catch (e) { /* ignore sqlite error */ }
  }
});

/**
 * Add a notification payload to the queue
 */
export async function queueNotification(payload: NotificationPayload): Promise<void> {
  const db = getDatabase();
  
  // Check Emergency Stop setting
  const emergencyStop = db.prepare("SELECT value FROM settings WHERE key = 'emergency_stop'").get() as { value: string } | undefined;
  if (emergencyStop && emergencyStop.value === 'true') {
     console.log('[Queue] Notifications skipped. emergency_stop is true.');
     return;
  }

  // Check Staging mode rules (Whitelist)
  const stagingMode = db.prepare("SELECT value FROM settings WHERE key = 'staging_mode'").get() as { value: string } | undefined;
  if (stagingMode && stagingMode.value === 'true') {
     // Ensure phone is in whitelist
     const whitelisted = db.prepare("SELECT phone FROM staging_whitelist WHERE phone = ?").get(payload.phone);
     if (!whitelisted) {
        console.log(`[Queue] Notification skipped for ${payload.phone} due to active Staging Mode.`);
        return;
     }
  }

  await notificationQueue.add(payload);
  console.log(`[Queue] Added notification to queue for ${payload.phone}`);
}
