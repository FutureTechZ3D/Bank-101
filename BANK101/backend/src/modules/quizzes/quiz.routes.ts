import { Router } from 'express';
import { 
  getExamCategories, 
  getExamTypes, 
  getSubjects, 
  getQuizzes, 
  getQuizDetails, 
  getQuestions, 
  startAttempt, 
  answerQuestion, 
  getAttemptState,
  submitAttempt, 
  useHint, 
  getHintCount, 
  getResultByAttempt,
  getLeaderboard,
  getCertificates,
  getAnalytics
} from './quiz.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Categories, types, subjects, quizzes & questions
router.get('/exams/categories', authMiddleware, getExamCategories);
router.get('/exams/types', authMiddleware, getExamTypes);
router.get('/subjects', authMiddleware, getSubjects);
router.get('/quizzes', authMiddleware, getQuizzes);
router.get('/quizzes/:topic', authMiddleware, getQuizzes);
router.get('/quizzes/detail/:id', authMiddleware, getQuizDetails);
router.get('/questions', authMiddleware, getQuestions);

// Attempts & answers
router.post('/attempts/start', authMiddleware, startAttempt);
router.post('/attempts/answer', authMiddleware, answerQuestion);
router.get('/attempts/:id/state', authMiddleware, getAttemptState);
router.post('/attempts/submit', authMiddleware, submitAttempt);

// Hint system
router.post('/hints/use', authMiddleware, useHint);
router.get('/hints/count', authMiddleware, getHintCount);

// Scoring scorecard review
router.get('/results/:attemptId', authMiddleware, getResultByAttempt);

// Telemetry & progress progress features
router.get('/leaderboard', authMiddleware, getLeaderboard);
router.get('/certificates', authMiddleware, getCertificates);
router.get('/analytics', authMiddleware, getAnalytics);

export default router;
