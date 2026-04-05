import QRCode from 'qrcode';
import { env } from '../config/env';

/**
 * QR Service for device labels and tracking.
 */
export class QrService {
  /**
   * Generate a QR data URL for a device tracking link.
   * Format: https://portal.com/device/CODE
   */
  static async generateDeviceQR(deviceCode: string): Promise<string> {
    // Generate the tracking URL for the customer
    const url = `${env.FRONTEND_URL}/device/${deviceCode}`;
    
    try {
      // Create QR as a Data URL (base64)
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#3b82f6', // Brand primary color
          light: '#ffffff'
        }
      });
      return qrDataUrl;
    } catch (err) {
      console.error('[QR] Failed to generate:', err);
      throw err;
    }
  }

  /**
   * Generate a buffer directly for image responses.
   */
  static async generateBuffer(text: string): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 500
    });
  }
}
