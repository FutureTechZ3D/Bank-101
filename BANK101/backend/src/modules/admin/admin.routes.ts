import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import { importQuizzes, validatePayload } from './importQuizzes';
import {
  getDashboardStats,
  listUsers, getUserById, updateUser, deleteUser,
  listCategories, createCategory, updateCategory, deleteCategory,
  listQuestions, getQuestionDetail, updateQuestion, deleteQuestion,
  listQuizTests, updateQuizTest, deleteQuizTest,
  listAttempts,
  getAdminAnalytics,
  listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getSettings, upsertSetting,
  listAuditLogs,
} from './admin.controller';

const router = Router();

// Every admin route requires a valid token AND the Admin role (checked in DB).
router.use(authMiddleware, requireAdmin);

// ── 01. Dashboard ──────────────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// ── 02. User Management ───────────────────────────────────────────────────
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ── 03. Exam Categories ───────────────────────────────────────────────────
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── 04. Question Bank ─────────────────────────────────────────────────────
router.get('/questions', listQuestions);
router.get('/questions/:id', getQuestionDetail);
router.patch('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// ── 05. Quiz/Exam Management ──────────────────────────────────────────────
router.get('/quizzes', listQuizTests);
router.patch('/quizzes/:id', updateQuizTest);
router.delete('/quizzes/:id', deleteQuizTest);

// ── 06. Dataset upload (import quizzes from JSON) ─────────────────────────
router.post('/upload-quiz', async (req, res) => {
  const { topic, quizzesData, subject_id } = req.body || {};
  const problem = validatePayload(topic, quizzesData);
  if (problem) return res.status(400).json({ success: false, error: problem });
  try {
    const out = await importQuizzes(topic, quizzesData, {
      subjectId: Number.isInteger(subject_id) ? subject_id : undefined,
    });
    res.json({
      success: true,
      message: `Uploaded ${out.quizzes} quizzes and ${out.questions} questions to ${topic.trim()}!`,
      quizzes: out.quizzes,
      questions: out.questions,
    });
  } catch (error: any) {
    console.error('Upload quiz error:', error);
    if (error?.status === 400) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: 'Failed to upload quiz data' });
  }
});

// ── 07. Attempt Management ────────────────────────────────────────────────
router.get('/attempts', listAttempts);

// ── 08. Analytics ─────────────────────────────────────────────────────────
router.get('/analytics', getAdminAnalytics);

// ── 09. Announcements ─────────────────────────────────────────────────────
router.get('/announcements', listAnnouncements);
router.post('/announcements', createAnnouncement);
router.patch('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// ── 10. System Settings ───────────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', upsertSetting);

// ── 11. Audit Logs ────────────────────────────────────────────────────────
router.get('/audit-logs', listAuditLogs);

export default router;
