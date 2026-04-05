import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';

/**
 * Request logger middleware.
 * Logs all requests and records important actions in system_logs.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';

    console.log(
      `[${logLevel}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

/**
 * Log an action to the system_logs table
 */
export function logAction(
  userType: 'customer' | 'admin' | 'system',
  userId: string,
  action: string,
  details?: string,
  ip?: string
): void {
  try {
    const db = getDatabase();
    db.prepare(
      `INSERT INTO system_logs (user_type, user_id, action, details, ip)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userType, userId, action, details ?? null, ip ?? null);
  } catch (err) {
    console.error('[Logger] Failed to write system log:', err);
  }
}
