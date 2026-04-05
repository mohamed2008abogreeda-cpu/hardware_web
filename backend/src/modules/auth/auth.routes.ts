import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import {
  handleRequestOtp,
  handleVerifyOtp,
  handleMagicLink,
  handleLogout,
  handleAdminLogin,
  handleAdminLogout,
} from './auth.controller';
import { adminLimiter } from '../../middleware/rate-limiter';

const router = Router();

// Customer auth
router.post('/request-otp', asyncHandler(handleRequestOtp));
router.post('/verify-otp', asyncHandler(handleVerifyOtp));
router.get('/magic', asyncHandler(handleMagicLink));
router.post('/logout', asyncHandler(handleLogout));

export default router;

// Admin auth (mounted separately at /api/admin)
export const adminAuthRouter = Router();
adminAuthRouter.post('/login', adminLimiter, asyncHandler(handleAdminLogin));
adminAuthRouter.post('/logout', asyncHandler(handleAdminLogout));
