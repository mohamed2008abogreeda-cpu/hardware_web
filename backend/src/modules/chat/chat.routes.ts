import multer from 'multer';
import path from 'path';
import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { authenticate } from '../../middleware/auth.middleware';
import { chatLimiter } from '../../middleware/rate-limiter';
import {
  handleGetMessages,
  handleSendMessage,
  handleCloseChat,
} from './chat.controller';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/chat/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/mpeg'
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم (صور، PDF، أو تسجيل صوتي)'));
    }
  },
});

const router = Router();

router.get('/:deviceCode/messages', authenticate, asyncHandler(handleGetMessages));
router.post('/:deviceCode/messages', authenticate, chatLimiter, upload.single('file'), asyncHandler(handleSendMessage));
router.post('/:deviceCode/close', authenticate, asyncHandler(handleCloseChat));

export default router;
