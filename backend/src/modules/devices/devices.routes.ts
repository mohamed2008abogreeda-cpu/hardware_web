import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import {
  handleGetDevices,
  handleGetDevice,
  handleCreateShareLink,
  handleOnMyWay,
  handleGetShareLink,
} from './devices.controller';

const router = Router();

// Customer device list (requires auth — returns only user's devices)
router.get('/', authenticate, asyncHandler(handleGetDevices));

// Single device lookup (optional auth — works for kiosk too)
router.get('/:code', optionalAuth, asyncHandler(handleGetDevice));

// Actions requiring auth
router.post('/:code/share', authenticate, asyncHandler(handleCreateShareLink));
router.post('/:code/ontheway', authenticate, asyncHandler(handleOnMyWay));

export default router;

// Share link endpoint (public, no auth)
export const shareRouter = Router();
shareRouter.get('/:token', asyncHandler(handleGetShareLink));
