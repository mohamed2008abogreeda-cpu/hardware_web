import { Request, Response } from 'express';
import * as authService from './auth.service';
import { requestOtpSchema, verifyOtpSchema, adminLoginSchema } from './auth.schemas';
import { ValidationError } from '../../utils/errors';

// Cookie options per SECURITY-RULES.md
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

const ADMIN_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 30 * 60 * 1000, // 30 minutes
};

/**
 * POST /api/auth/request-otp
 */
export function handleRequestOtp(req: Request, res: Response): void {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('بيانات غير صالحة', errors);
  }

  const result = authService.requestOtp(parsed.data.phone);
  res.json({ success: true, data: result });
}

/**
 * POST /api/auth/verify-otp
 */
export function handleVerifyOtp(req: Request, res: Response): void {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('بيانات غير صالحة', errors);
  }

  const { token } = authService.verifyOtp(parsed.data.phone, parsed.data.code);
  res.cookie('jwt', token, COOKIE_OPTIONS);
  res.json({ success: true, data: { message: 'تم تسجيل الدخول بنجاح' } });
}

/**
 * GET /api/auth/magic?token=xxx
 */
export function handleMagicLink(req: Request, res: Response): void {
  const token = req.query.token as string;
  if (!token) {
    throw new ValidationError('رابط غير صالح');
  }

  const { jwtToken } = authService.verifyMagicLink(token);
  res.cookie('jwt', jwtToken, COOKIE_OPTIONS);
  res.json({ success: true, data: { message: 'تم تسجيل الدخول بنجاح' } });
}

/**
 * POST /api/auth/logout
 */
export function handleLogout(req: Request, res: Response): void {
  const token = req.cookies?.jwt;
  if (token) {
    // try to grab the phone from the token payload (this implies we decode it, 
    // but authService.verifyToken could be used, or just pass unknown if we don't have it)
    authService.logout(token, 'customer'); 
  }
  res.clearCookie('jwt', COOKIE_OPTIONS);
  res.json({ success: true, data: { message: 'تم تسجيل الخروج' } });
}

/**
 * POST /api/admin/login
 */
export function handleAdminLogin(req: Request, res: Response): void {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('بيانات غير صالحة', errors);
  }

  const { token, role } = authService.adminLogin(
    parsed.data.username,
    parsed.data.password,
    parsed.data.twoFactorCode
  );

  res.cookie('jwt', token, ADMIN_COOKIE_OPTIONS);
  res.json({ success: true, data: { role } });
}

/**
 * POST /api/admin/logout
 */
export function handleAdminLogout(req: Request, res: Response): void {
  const token = req.cookies?.jwt;
  if (token) {
    authService.logout(token, 'admin');
  }
  res.clearCookie('jwt', ADMIN_COOKIE_OPTIONS);
  res.json({ success: true, data: { message: 'تم تسجيل الخروج' } });
}
