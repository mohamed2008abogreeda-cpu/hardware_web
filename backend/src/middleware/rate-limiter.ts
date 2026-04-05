import rateLimit from 'express-rate-limit';

/**
 * Rate limiters per SECURITY-RULES.md
 */

/** Search/OTP page — 3 failed attempts = 15 min block */
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'محاولات كتير، حاول بعد ١٥ دقيقة',
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Admin login — 5 attempts per 15 minutes */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'تم حجب الـ IP بسبب محاولات دخول متكررة',
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Chat — 1 message per 10 seconds */
export const chatLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 1,
  message: {
    success: false,
    error: 'انتظر ١٠ ثواني بين كل رسالة',
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Device page — 3 attempts per minute */
export const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'محاولات كتير للوصول لهذا الجهاز',
    code: 429,
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/** General API — 100 requests per minute */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'عدد كبير جداً من الطلبات. حاول لاحقاً.',
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
