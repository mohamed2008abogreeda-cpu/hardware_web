import { Request, Response } from 'express';
import * as devicesService from './devices.service';
import type { CustomerJWTPayload } from '../../types';

/**
 * GET /api/devices — customer's own devices
 */
export function handleGetDevices(req: Request, res: Response): void {
  const user = req.user as CustomerJWTPayload;
  const devices = devicesService.getDevicesByPhone(user.phone);
  res.json({ success: true, data: devices });
}

/**
 * GET /api/devices/:code — single device detail
 */
export function handleGetDevice(req: Request, res: Response): void {
  const device = devicesService.getDeviceByCode(req.params.code as string);
  res.json({ success: true, data: device });
}

/**
 * POST /api/devices/:code/share — create share link
 */
export function handleCreateShareLink(req: Request, res: Response): void {
  const result = devicesService.createShareLink(req.params.code as string);
  res.json({ success: true, data: result });
}

/**
 * POST /api/devices/:code/ontheway — notify "I'm on my way"
 */
export function handleOnMyWay(req: Request, res: Response): void {
  devicesService.notifyOnMyWay(req.params.code as string);

  // Notify admin via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to('admin').emit('admin:client:enroute', {
      deviceCode: req.params.code,
    });
  }

  res.json({ success: true, data: { message: 'تم إخطار الفريق بأنك في الطريق' } });
}

/**
 * GET /api/share/:token — get device by share link (no auth)
 */
export function handleGetShareLink(req: Request, res: Response): void {
  const device = devicesService.getDeviceByShareToken(req.params.token as string);
  res.json({ success: true, data: device });
}
