import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { authenticate } from '../../middleware/auth.middleware';
import { PushService } from '../../services/push.service';
import { env } from '../../config/env';

const router = Router();

/**
 * Get VAPID public key.
 */
router.get('/keys', authenticate, (_req: Request, res: Response) => {
  res.json({ success: true, publicKey: env.VAPID_PUBLIC_KEY });
});

/**
 * Save browser push subscription.
 */
router.post('/subscribe', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { subscription } = req.body;
  if (!subscription) {
    res.status(400).json({ success: false, error: 'المشترك مطلوب' });
    return;
  }

  const role = req.user?.role;
  const userType = role === 'customer' ? 'customer' : 'admin';
  const userId = role === 'customer' ? (req.user as any).phone : (req.user as any).username;

  PushService.subscribe(userType, userId, subscription);

  res.json({ success: true, message: 'تم الاشتراك في الإشعارات بنجاح' });
}));

export default router;
