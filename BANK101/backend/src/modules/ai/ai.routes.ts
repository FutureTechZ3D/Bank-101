import { Router } from 'express';
import {
  askTutor,
  getSession,
  listSessions,
  generateStudyPlan,
  getStudyPlan,
  togglePlanItem,
  getWeaknesses,
  getPerformanceLab,
  recordOfficialResult,
} from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

export const aiRouter = Router();

// AI Grounded Tutor
aiRouter.post('/tutor/ask', authMiddleware, askTutor);
aiRouter.get('/tutor/sessions', authMiddleware, listSessions);
aiRouter.get('/tutor/sessions/:id', authMiddleware, getSession);

// Dynamic Syllabus Study Planner
aiRouter.post('/study-plan/generate', authMiddleware, generateStudyPlan);
aiRouter.get('/study-plan/:examId', authMiddleware, getStudyPlan);
aiRouter.patch('/study-plan/items/:itemId', authMiddleware, togglePlanItem);

// Student Diagnostics & Three-Tier Performance Lab
aiRouter.get('/weaknesses', authMiddleware, getWeaknesses);
aiRouter.get('/performance-lab/:examId', authMiddleware, getPerformanceLab);
aiRouter.post('/performance-lab/official-result', authMiddleware, recordOfficialResult);

