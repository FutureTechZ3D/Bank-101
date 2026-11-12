import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { InstitutionService } from './institution.service';

export async function listInstitutions(_req: AuthenticatedRequest, res: Response) {
  try {
    const data = await InstitutionService.listInstitutions();
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in listInstitutions:', err);
    return res.status(500).json({ success: false, message: 'Failed to list institutions' });
  }
}

export async function getInstitution(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = req.params.slug;
    const userId = req.user?.id;
    const data = await InstitutionService.getInstitutionDetail(slug, userId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Institution not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in getInstitution:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch institution' });
  }
}

export async function joinInstitution(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { institutionId, role } = req.body;
    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'institutionId is required' });
    }
    const member = await InstitutionService.joinInstitution(Number(institutionId), userId, role || 'student');
    return res.status(200).json({ success: true, data: member });
  } catch (err: any) {
    console.error('Error in joinInstitution:', err);
    return res.status(500).json({ success: false, message: 'Failed to join institution' });
  }
}

export async function createBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { institutionId, name, targetExamId, academicYear } = req.body;
    if (!institutionId || !name) {
      return res.status(400).json({ success: false, message: 'institutionId and name are required' });
    }
    const batch = await InstitutionService.createBatch({
      institutionId: Number(institutionId),
      name: name.trim(),
      targetExamId: targetExamId ? Number(targetExamId) : undefined,
      academicYear,
    });
    return res.status(201).json({ success: true, data: batch });
  } catch (err: any) {
    console.error('Error in createBatch:', err);
    return res.status(500).json({ success: false, message: 'Failed to create batch' });
  }
}

export async function enrollStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const batchId = Number(req.params.batchId);
    const { userId, enrollmentNo } = req.body;
    const targetUserId = userId ? Number(userId) : req.user?.id;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const enrollment = await InstitutionService.enrollStudent(batchId, targetUserId, enrollmentNo);
    return res.status(200).json({ success: true, data: enrollment });
  } catch (err: any) {
    console.error('Error in enrollStudent:', err);
    return res.status(500).json({ success: false, message: 'Failed to enroll student' });
  }
}

export async function assignBatchTest(req: AuthenticatedRequest, res: Response) {
  try {
    const batchId = Number(req.params.batchId);
    const { quizId, deadline, isMandatory } = req.body;
    if (!quizId) {
      return res.status(400).json({ success: false, message: 'quizId is required' });
    }
    const assignment = await InstitutionService.assignBatchTest({
      batchId,
      quizId: Number(quizId),
      assignedBy: req.user?.id,
      deadline,
      isMandatory,
    });
    return res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    console.error('Error in assignBatchTest:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign test' });
  }
}

export async function getBatchDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const batchId = Number(req.params.batchId);
    const data = await InstitutionService.getBatchDetails(batchId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in getBatchDetails:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch batch details' });
  }
}

