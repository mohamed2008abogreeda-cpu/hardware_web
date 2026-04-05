import { Request, Response } from 'express';
import { ratingSchema, submitRating } from './ratings.service';
import { ValidationError } from '../../utils/errors';

export function handleSubmitRating(req: Request, res: Response): void {
  const deviceCode = req.params.deviceCode as string;
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new ValidationError('بيانات التقييم غير صالحة', errors);
  }

  const { isBad } = submitRating(deviceCode, parsed.data);

  // Notify admin if bad rating
  if (isBad) {
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('admin:rating:bad', {
        deviceCode,
        comment: parsed.data.comment,
      });
    }
  }

  res.json({ success: true, data: { message: 'شكراً على تقييمك! 🌟' } });
}
