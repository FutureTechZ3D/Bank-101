import { Router } from 'express';
import {
  listInstitutions,
  getInstitution,
  joinInstitution,
  createBatch,
  enrollStudent,
  assignBatchTest,
  getBatchDetails,
} from './institution.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const institutionRouter = Router();

institutionRouter.get('/', authMiddleware, listInstitutions);
institutionRouter.get('/:slug', authMiddleware, getInstitution);
institutionRouter.post('/join', authMiddleware, joinInstitution);
institutionRouter.post('/batches', authMiddleware, createBatch);
institutionRouter.post('/batches/:batchId/enroll', authMiddleware, enrollStudent);
institutionRouter.post('/batches/:batchId/assign', authMiddleware, assignBatchTest);
institutionRouter.get('/batches/:batchId', authMiddleware, getBatchDetails);

