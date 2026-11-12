import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AIService } from './ai.service';

export async function askTutor(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { examId, topicId, sessionId, message, language } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message query is required' });
    }

    const response = await AIService.askAITutor({
      userId,
      examId: examId ? Number(examId) : undefined,
      topicId: topicId ? Number(topicId) : undefined,
      sessionId: sessionId ? Number(sessionId) : undefined,
      message: message.trim(),
      language: language === 'ta' ? 'ta' : 'en',
    });

    return res.status(200).json({ success: true, data: response });
  } catch (err: any) {
    console.error('Error in askTutor:', err);
    return res.status(500).json({ success: false, message: 'Failed to process AI tutor query' });
  }
}

export async function getSession(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const sessionId = Number(req.params.id);
    const data = await AIService.getSessionHistory(sessionId, userId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in getSession:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch session' });
  }
}

export async function listSessions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = await AIService.listUserSessions(userId);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in listSessions:', err);
    return res.status(500).json({ success: false, message: 'Failed to list AI sessions' });
  }
}

export async function generateStudyPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { examId, targetExamDate, dailyStudyHours } = req.body;
    if (!examId || !targetExamDate) {
      return res.status(400).json({ success: false, message: 'examId and targetExamDate are required' });
    }

    const plan = await AIService.generateStudyPlan({
      userId,
      examId: Number(examId),
      targetExamDate,
      dailyStudyHours: Number(dailyStudyHours || 3),
    });

    return res.status(200).json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Error in generateStudyPlan:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate study plan' });
  }
}

export async function getStudyPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const examId = Number(req.params.examId);
    const plan = await AIService.getStudyPlan(userId, examId);
    return res.status(200).json({ success: true, data: plan });
  } catch (err: any) {
    console.error('Error in getStudyPlan:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch study plan' });
  }
}

export async function togglePlanItem(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const itemId = Number(req.params.itemId);
    const { isCompleted } = req.body;

    const updated = await AIService.toggleStudyPlanItem(userId, itemId, Boolean(isCompleted));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Study plan item not found' });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in togglePlanItem:', err);
    return res.status(500).json({ success: false, message: 'Failed to update plan item' });
  }
}

export async function getWeaknesses(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const data = await AIService.getStudentWeaknesses(userId);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Error in getWeaknesses:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve weaknesses' });
  }
}

export async function getPerformanceLab(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const examId = Number(req.params.examId);
    const scorecard = await AIService.getPerformanceLab(userId, examId);
    return res.status(200).json({ success: true, data: scorecard });
  } catch (err: any) {
    console.error('Error in getPerformanceLab:', err);
    return res.status(500).json({ success: false, message: 'Failed to load Performance Lab' });
  }
}

export async function recordOfficialResult(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { examId, rollNumber, officialMarks, totalMarks, rankAchieved, publicationDate, proofUrl } = req.body;
    if (!examId || officialMarks === undefined || !rollNumber) {
      return res.status(400).json({ success: false, message: 'examId, rollNumber, and officialMarks are required' });
    }

    const result = await AIService.recordOfficialResult({
      userId,
      examId: Number(examId),
      rollNumber,
      officialMarks: Number(officialMarks),
      totalMarks: Number(totalMarks || 300),
      rankAchieved: rankAchieved ? Number(rankAchieved) : undefined,
      publicationDate,
      proofUrl,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error in recordOfficialResult:', err);
    return res.status(500).json({ success: false, message: 'Failed to record official result' });
  }
}

