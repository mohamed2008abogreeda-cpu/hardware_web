import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDatabase } from '../../config/database';
import { phoneExists } from '../../config/access-reader';
import { UserModel } from '../../models/user.model';
import { env } from '../../config/env';
import { UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';
import { logAction } from '../../middleware/logger';
import type { CustomerJWTPayload, AdminJWTPayload } from '../../types';
import { queueNotification } from '../../services/queue.service';
import { trackEvent, identifyUser } from '../../services/analytics.service';

// ============================================
// OTP Management (in-memory for development,
// will migrate to Redis for production)
// ============================================
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Request an OTP for a phone number.
 * Verifies the phone exists in the Access DB first.
 */
export function requestOtp(phone: string): { success: boolean; message: string; devCode?: string } {
  // Generate OTP
  const code = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { code, expiresAt, attempts: 0 });

  // In development: log the OTP and return it directly
  if (env.NODE_ENV === 'development') {
    console.log(`[Auth] OTP for ${phone}: ${code}`);
    return { success: true, message: `(لأغراض التجربة) الكود هو: ${code}`, devCode: code };
  }

  // Check phone exists in Access database (only in production)
  if (!phoneExists(phone)) {
    otpStore.delete(phone);
    return { success: true, message: 'تم إرسال رمز التحقق' };
  }

  console.log(`[Auth] OTP for ${phone}: ${code}`);

  // Send OTP via Queue (which handles Whatsapp/SMS based on templates)
  void queueNotification({
    phone,
    eventType: 'system_alert', // Or create an otp_requested template
    data: { message: `رمز التحقق الخاص بك هو: ${code}` }
  });

  logAction('system', phone, 'OTP_REQUESTED');

  return { success: true, message: 'تم إرسال رمز التحقق' };
}

/**
 * Verify an OTP and return a JWT token.
 */
export function verifyOtp(phone: string, code: string): { token: string } {
  const stored = otpStore.get(phone);

  if (!stored) {
    throw new UnauthorizedError('لم يتم طلب رمز تحقق لهذا الرقم');
  }

  // Check expiry
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    throw new UnauthorizedError('انتهت صلاحية رمز التحقق');
  }

  // Check attempts (max 3)
  if (stored.attempts >= 3) {
    otpStore.delete(phone);
    throw new UnauthorizedError('تجاوزت عدد المحاولات المسموحة');
  }

  // Verify code
  if (stored.code !== code) {
    stored.attempts++;
    throw new UnauthorizedError('رمز التحقق غير صحيح');
  }

  // OTP valid — clean up and generate JWT
  otpStore.delete(phone);

  const payload: CustomerJWTPayload = {
    phone,
    role: 'customer',
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: 86400, // 24 hours in seconds
  });

  // Create session in DB
  const db = getDatabase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT OR REPLACE INTO sessions (token, phone, expires_at) VALUES (?, ?, ?)'
  ).run(token, phone, expiresAt);

  logAction('customer', phone, 'LOGIN_SUCCESS');
  
  identifyUser(phone, { role: 'customer' });
  trackEvent(phone, 'LOGIN_SUCCESS');

  return { token };
}

/**
 * Generate a magic link token for a phone number.
 */
export function generateMagicLink(phone: string): string {
  if (!phoneExists(phone)) {
    throw new NotFoundError('رقم الهاتف غير مسجل');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  const db = getDatabase();
  db.prepare(
    'INSERT OR REPLACE INTO sessions (token, phone, expires_at) VALUES (?, ?, ?)'
  ).run(token, phone, expiresAt);

  logAction('system', phone, 'MAGIC_LINK_GENERATED');

  return token;
}

/**
 * Verify a magic link token.
 */
export function verifyMagicLink(token: string): { jwtToken: string; phone: string } {
  const db = getDatabase();
  const session = db.prepare(
    'SELECT phone, expires_at FROM sessions WHERE token = ?'
  ).get(token) as { phone: string; expires_at: string } | undefined;

  if (!session) {
    throw new UnauthorizedError('رابط غير صالح');
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    throw new UnauthorizedError('انتهت صلاحية الرابط');
  }

  // Clean up magic link and create JWT session
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);

  const payload: CustomerJWTPayload = {
    phone: session.phone,
    role: 'customer',
  };

  const jwtToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: 86400, // 24 hours in seconds
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (token, phone, expires_at) VALUES (?, ?, ?)'
  ).run(jwtToken, session.phone, expiresAt);

  return { jwtToken, phone: session.phone };
}

/**
 * Admin login with username/password + optional 2FA.
 */
export function adminLogin(
  username: string,
  password: string,
  twoFactorCode?: string
): { token: string; role: 'admin' | 'tech' | 'viewer' } {
  let role: 'admin' | 'tech' | 'viewer' = 'admin';

  // 1. Check database for user
  const dbUser = UserModel.findByUsername(username);
  
  if (dbUser) {
    if (!dbUser.is_active) {
      logAction('system', username, 'LOGIN_FAILED_INACTIVE');
      throw new UnauthorizedError('هذا الحساب موقوف من قبل الإدارة');
    }
    const passwordMatch = bcrypt.compareSync(password, dbUser.password_hash);
    if (!passwordMatch) {
      logAction('system', username, 'LOGIN_FAILED');
      throw new UnauthorizedError('بيانات دخول خاطئة');
    }
    role = dbUser.role;
  } else {
    // 2. Fallback to ENV admin
    if (username !== env.ADMIN_USERNAME) {
      logAction('system', username, 'LOGIN_FAILED_NOT_FOUND');
      throw new UnauthorizedError('بيانات دخول خاطئة');
    }
    const passwordMatch = bcrypt.compareSync(password, env.ADMIN_PASSWORD_HASH);
    if (!passwordMatch) {
      logAction('system', username, 'LOGIN_FAILED');
      throw new UnauthorizedError('بيانات دخول خاطئة');
    }
    role = 'admin';
  }

  // Check 2FA if code is stored
  const db = getDatabase();
  const pending2FA = db.prepare(
    'SELECT code, expires_at FROM admin_2fa_codes WHERE username = ? ORDER BY expires_at DESC LIMIT 1'
  ).get(username) as { code: string; expires_at: string } | undefined;

  if (pending2FA && new Date(pending2FA.expires_at) > new Date()) {
    if (!twoFactorCode) {
      throw new ValidationError('رمز التحقق الثنائي مطلوب', [
        { field: 'twoFactorCode', message: 'مطلوب' },
      ]);
    }
    if (pending2FA.code !== twoFactorCode) {
      throw new UnauthorizedError('رمز التحقق الثنائي غير صحيح');
    }
    // Clean up used 2FA code
    db.prepare('DELETE FROM admin_2fa_codes WHERE username = ?').run(username);
  }

  // Generate admin JWT
  const payload: AdminJWTPayload = {
    username,
    role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: 1800, // 30 minutes in seconds
  });

  // Store admin session
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO admin_sessions (token, username, role, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, username, role, expiresAt);

  // Standardize log metric under 'admin' for staff
  logAction('admin', username, 'ADMIN_LOGIN_SUCCESS');

  identifyUser(username, { role });
  trackEvent(username, 'ADMIN_LOGIN_SUCCESS');

  return { token, role };
}

/**
 * Logout — invalidate session.
 */
export function logout(token: string, userId: string = 'unknown'): void {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  
  trackEvent(userId, 'LOGOUT_SUCCESS');
}

/**
 * Verify a JWT token and return the payload.
 */
export function verifyToken(token: string): CustomerJWTPayload | AdminJWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as CustomerJWTPayload | AdminJWTPayload;
  } catch {
    throw new UnauthorizedError('جلسة غير صالحة');
  }
}
