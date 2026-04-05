import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { handleSubmitRating } from './ratings.controller';

const router = Router();

router.post('/:deviceCode', asyncHandler(handleSubmitRating));

export default router;
