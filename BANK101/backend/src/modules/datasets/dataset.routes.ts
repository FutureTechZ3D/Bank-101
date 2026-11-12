import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import { previewDataset, importDataset } from './dataset.controller';

export const datasetRouter = Router();

// Ingestion endpoints require admin authorization
datasetRouter.post('/preview', authMiddleware, requireAdmin, previewDataset);
datasetRouter.post('/import', authMiddleware, requireAdmin, importDataset);

