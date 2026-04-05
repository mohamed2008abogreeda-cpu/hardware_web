import { getDatabase } from '../../config/database';
import { z } from 'zod';
import { trackEvent } from '../../services/analytics.service';

export const ratingSchema = z.object({
  type: z.enum(['service', 'chat']),
  rating_speed: z.number().min(1).max(5),
  rating_quality: z.number().min(1).max(5),
  rating_handling: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
  chat_conversation_id: z.string().optional(),
});

export type RatingInput = z.infer<typeof ratingSchema>;

export function submitRating(deviceCode: string, data: RatingInput): { isBad: boolean } {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO ratings (device_code, type, rating_speed, rating_quality, rating_handling, comment, chat_conversation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    deviceCode,
    data.type,
    data.rating_speed,
    data.rating_quality,
    data.rating_handling,
    data.comment || null,
    data.chat_conversation_id || null
  );

  // Check if it's a bad rating (any score < 3)
  const isBad = data.rating_speed < 3 || data.rating_quality < 3 || data.rating_handling < 3;

  trackEvent(deviceCode, 'RATING_SUBMITTED', {
    type: data.type,
    speed: data.rating_speed,
    quality: data.rating_quality,
    handling: data.rating_handling,
    isBad
  });

  return { isBad };
}

export function getAverageRating(): { avgSpeed: number; avgQuality: number; avgHandling: number; totalCount: number } {
  const db = getDatabase();
  const result = db.prepare(
    `SELECT
       ROUND(AVG(rating_speed), 1) as avgSpeed,
       ROUND(AVG(rating_quality), 1) as avgQuality,
       ROUND(AVG(rating_handling), 1) as avgHandling,
       COUNT(*) as totalCount
     FROM ratings`
  ).get() as { avgSpeed: number; avgQuality: number; avgHandling: number; totalCount: number };
  return result;
}
