import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { handleGetApproval, handleRespondApproval } from './approvals.controller';
import * as approvalsService from './approvals.service';

const router = Router();

// Device-code based routes (admin use)
router.get('/:deviceCode', asyncHandler(handleGetApproval));
router.post('/:deviceCode', asyncHandler(handleRespondApproval));

// Token-based routes (customer link)
router.get('/verify/:token', asyncHandler((req: Request, res: Response) => {
  const token = req.params.token as string;
  const approval = approvalsService.verifyApprovalToken(token);

  if (!approval) {
    res.status(404).json({ success: false, error: 'رابط غير صالح', code: 404 });
    return;
  }

  if ((approval as Record<string, unknown>).expired) {
    res.status(410).json({ success: false, error: 'انتهت صلاحية الرابط', code: 410 });
    return;
  }

  res.json({ success: true, data: approval });
}));

router.post('/respond/:token', asyncHandler((req: Request, res: Response) => {
  const token = req.params.token as string;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: 'الرد يجب أن يكون approved أو rejected', code: 400 });
    return;
  }

  const result = approvalsService.respondByToken(token, status);

  if (!result) {
    res.status(404).json({ success: false, error: 'رابط غير صالح أو منتهي', code: 404 });
    return;
  }

  // Notify admin
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit(status === 'approved' ? 'admin:device:approved' : 'admin:device:rejected', {
      deviceCode: result.deviceCode,
    });
  }

  res.json({ success: true, data: { message: 'تم تسجيل ردك بنجاح' } });
}));

export default router;
