import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { QrService } from '../../services/qr.service';
import { getRepairByCode } from '../../config/access-reader';
import { NotFoundError } from '../../utils/errors';

const router = Router();

/**
 * GET /api/qr/device/:code
 * Returns PNG QR code for a device.
 */
router.get('/device/:code', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const device = getRepairByCode(code as string);
  
  if (!device) {
    throw new NotFoundError('الجهاز غير موجود');
  }

  const qrBuffer = await QrService.generateBuffer(
    `${req.protocol}://${req.get('host')}/device/${code}`
  );

  res.setHeader('Content-Type', 'image/png');
  res.send(qrBuffer);
}));

export default router;
