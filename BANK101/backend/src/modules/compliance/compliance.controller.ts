import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ComplianceService } from './compliance.service';

export async function recordConsent(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { purposeCode, consentGiven } = req.body;
    if (!purposeCode) {
      return res.status(400).json({ success: false, message: 'purposeCode is required' });
    }
    const record = await ComplianceService.recordConsent({
      userId,
      purposeCode,
      consentGiven: Boolean(consentGiven),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    console.error('Error in recordConsent:', err);
    return res.status(500).json({ success: false, message: 'Failed to record consent' });
  }
}

export async function getConsentHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const data = await ComplianceService.getConsentHistory(userId);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in getConsentHistory:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch consent history' });
  }
}

export async function exportPersonalData(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const archive = await ComplianceService.exportPersonalData(userId);
    return res.status(200).json({ success: true, data: archive });
  } catch (err: any) {
    console.error('Error in exportPersonalData:', err);
    return res.status(500).json({ success: false, message: 'Failed to export personal data' });
  }
}

export async function requestDataErasure(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { reason } = req.body;
    const request = await ComplianceService.requestDataErasure(userId, reason);
    return res.status(200).json({ success: true, data: request });
  } catch (err: any) {
    console.error('Error in requestDataErasure:', err);
    return res.status(500).json({ success: false, message: 'Failed to process erasure request' });
  }
}

export async function syncOfflineAttempt(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { clientAttemptUuid, quizId, clientStartedAt, clientSubmittedAt, answers } = req.body;
    if (!clientAttemptUuid || !quizId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'clientAttemptUuid, quizId, and answers array are required',
      });
    }

    const result = await ComplianceService.syncOfflineAttempt({
      userId,
      clientAttemptUuid,
      quizId: Number(quizId),
      clientStartedAt: clientStartedAt || new Date().toISOString(),
      clientSubmittedAt: clientSubmittedAt || new Date().toISOString(),
      answers,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error in syncOfflineAttempt:', err);
    return res.status(500).json({ success: false, message: 'Failed to ingest offline attempt' });
  }
}

