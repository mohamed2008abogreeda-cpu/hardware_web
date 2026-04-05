import { Request, Response } from 'express';
import * as approvalsService from './approvals.service';

export function handleGetApproval(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  const approval = approvalsService.getApproval(deviceCode);
  res.json({ success: true, data: approval });
}

export function handleRespondApproval(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  const { response, reason } = req.body;

  if (!response || !['approved', 'rejected'].includes(response)) {
    res.status(400).json({ success: false, error: 'الرد يجب أن يكون approved أو rejected', code: 400 });
    return;
  }

  approvalsService.respondToApproval(deviceCode, response, reason);

  // Notify admin
  const io = req.app.get('io');
  if (io) {
    const event = response === 'approved'
      ? 'admin:device:approved'
      : 'admin:device:rejected';
    io.to('admin').emit(event, {
      deviceCode,
      reason,
    });
  }

  res.json({ success: true, data: { message: 'تم تسجيل ردك بنجاح' } });
}
