import { z } from 'zod';

/**
 * Zod validation schemas for Authentication endpoints.
 */

export const requestOtpSchema = z.object({
  phone: z
    .string()
    .min(10, 'رقم الهاتف قصير جداً')
    .max(15, 'رقم الهاتف طويل جداً')
    .regex(/^0[0-9]{9,10}$/, 'رقم هاتف غير صالح'),
  countryCode: z.string().default('+20'),
  turnstileToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15),
  code: z
    .string()
    .length(6, 'الرمز يجب أن يكون 6 أرقام')
    .regex(/^[0-9]{6}$/, 'الرمز يجب أن يحتوي أرقام فقط'),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  twoFactorCode: z
    .string()
    .length(6)
    .regex(/^[0-9]{6}$/)
    .optional(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
