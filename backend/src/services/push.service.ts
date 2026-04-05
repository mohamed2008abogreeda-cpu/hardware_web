import webpush from 'web-push';
import { env } from '../config/env';
import { getDatabase } from '../config/database';

/**
 * Web Push Service.
 * Handles sending browser notifications.
 */
export class PushService {
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    
    webpush.setVapidDetails(
      'mailto:admin@hardware-portal.com', // or dynamic
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
    this.initialized = true;
  }

  /**
   * Save or update a subscription for a user.
   */
  static subscribe(userType: 'customer' | 'admin', userId: string, subscription: any) {
    const db = getDatabase();
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    db.prepare(
      `INSERT INTO push_subscriptions (user_id, user_type, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         user_type = excluded.user_type,
         p256dh = excluded.p256dh,
         auth = excluded.auth`
    ).run(userId, userType, endpoint, p256dh, auth);
  }

  /**
   * Unsubscribe (delete) a specific endpoint.
   */
  static unsubscribe(endpoint: string) {
    const db = getDatabase();
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  }

  /**
   * Send a notification to all devices of a user.
   */
  static async sendNotification(userType: 'customer' | 'admin', userId: string, payload: { title: string; body: string; icon?: string; url?: string }) {
    this.init();
    const db = getDatabase();
    const subscriptions = db.prepare(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND user_type = ?'
    ).all(userId, userType) as any[];

    const data = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          await webpush.sendNotification(pushSubscription, data);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or gone
            this.unsubscribe(sub.endpoint);
          }
          throw err;
        }
      })
    );

    return results;
  }
}
