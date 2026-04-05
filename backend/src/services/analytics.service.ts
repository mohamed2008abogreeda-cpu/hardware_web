import { PostHog } from 'posthog-node';
import { env } from '../config/env';

let posthogClient: PostHog | null = null;

if (env.POSTHOG_API_KEY) {
  posthogClient = new PostHog(env.POSTHOG_API_KEY, {
    host: env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 10,
    flushInterval: 2000,
  });
}

/**
 * Capture a custom event to PostHog Analytics
 */
export function trackEvent(distinctId: string, eventName: string, properties: Record<string, any> = {}) {
  if (!posthogClient) return;
  
  try {
    posthogClient.capture({
      distinctId,
      event: eventName,
      properties,
    });
  } catch (err) {
    console.error('[Analytics] Failed to track event:', err);
  }
}

/**
 * Identify a user with specific properties
 */
export function identifyUser(distinctId: string, properties: Record<string, any> = {}) {
  if (!posthogClient) return;

  try {
    posthogClient.identify({
      distinctId,
      properties,
    });
  } catch (err) {
    console.error('[Analytics] Failed to identify user:', err);
  }
}

/**
 * Graceful shutdown for the analytics client
 */
export async function shutdownAnalytics() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
