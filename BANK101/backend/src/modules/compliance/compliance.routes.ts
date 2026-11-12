import { Router } from 'express';
import {
  recordConsent,
  getConsentHistory,
  exportPersonalData,
  requestDataErasure,
  syncOfflineAttempt,
} from './compliance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const complianceRouter = Router();

// Indian DPDP Act Endpoints
complianceRouter.post('/consent', authMiddleware, recordConsent);
complianceRouter.get('/consent', authMiddleware, getConsentHistory);
complianceRouter.get('/export', authMiddleware, exportPersonalData);
complianceRouter.post('/forget-me', authMiddleware, requestDataErasure);

// Offline CBT Ingestion
complianceRouter.post('/sync', authMiddleware, syncOfflineAttempt);

