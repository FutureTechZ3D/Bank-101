import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { getStatsHandler, runPipelineHandler } from './pipeline.controller';

const router = Router();

// Pipeline endpoints require admin authentication
router.use(authMiddleware, requireAdmin);

router.get('/stats', getStatsHandler);
router.post('/run', runPipelineHandler);

export default router;
