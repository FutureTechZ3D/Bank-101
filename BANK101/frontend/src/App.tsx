import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './app/store/authStore';

// Layouts
import Sidebar from './components/common/Sidebar';
import AdminSidebar from './components/common/AdminSidebar';

// Pages — Auth
import LoginPage from './pages/auth/LoginPage';

// Pages — Student
import DashboardPage from './pages/dashboard/DashboardPage';
import ExamTypesPage from './pages/exams/ExamTypesPage';
import SubjectListPage from './pages/subjects/SubjectListPage';
import TopicListPage from './pages/subjects/TopicListPage';
import QuizListPage from './pages/quiz/QuizListPage';
import QuizDetailPage from './pages/quiz/QuizDetailPage';
import QuizEnginePage from './pages/quiz/QuizEnginePage';
import ResultPage from './pages/quiz/ResultPage';
import LeaderboardPage from './pages/analytics/LeaderboardPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import CertificatesPage from './pages/certificates/CertificatesPage';
import ExamDirectoryPage from './pages/directory/ExamDirectoryPage';
import ExamComparisonPage from './pages/directory/ExamComparisonPage';
import DigitalLibraryPage from './pages/library/DigitalLibraryPage';
import PYQRepositoryPage from './pages/library/PYQRepositoryPage';
import AITutorPage from './pages/ai/AITutorPage';
import PerformanceLabPage from './pages/ai/PerformanceLabPage';
import InstitutionWorkspacePage from './pages/institutions/InstitutionWorkspacePage';
import DataPrivacyPage from './pages/compliance/DataPrivacyPage';

// Pages — Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUpload from './pages/admin/AdminUpload';

// ── Route guards ─────────────────────────────────────────────────────────────

/** Redirect to /login if not authenticated. */
function RequireAuth() {
  const { token, user } = useAuthStore();
  const location = useLocation();
  if (!token || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Redirect non-admins away from admin routes. */
function RequireAdmin() {
  const { user } = useAuthStore();
  if (user?.account_type !== 'Admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Redirect authenticated users away from the login page. */
function RedirectIfAuth() {
  const { token, user } = useAuthStore();
  if (token && user) {
    return <Navigate to={user.account_type === 'Admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <Outlet />;
}

// ── Layout wrappers ──────────────────────────────────────────────────────────

function StudentLayout() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#020617] overflow-hidden w-full transition-colors duration-300">
      <Sidebar />
      <Outlet />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans w-full">
      <AdminSidebar />
      <Outlet />
    </div>
  );
}

// ── Root app ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Routes>
      {/* Public */}
      <Route element={<RedirectIfAuth />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Student routes */}
      <Route element={<RequireAuth />}>
        {/* Exam room is full-screen (no sidebar) */}
        <Route path="/exam/:attemptId?" element={<QuizEnginePage />} />

        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/directory" element={<ExamDirectoryPage />} />
          <Route path="/compare" element={<ExamComparisonPage />} />
          <Route path="/library" element={<DigitalLibraryPage />} />
          <Route path="/pyq" element={<PYQRepositoryPage />} />
          <Route path="/ai-tutor" element={<AITutorPage />} />
          <Route path="/performance-lab" element={<PerformanceLabPage />} />
          <Route path="/institutions" element={<InstitutionWorkspacePage />} />
          <Route path="/privacy" element={<DataPrivacyPage />} />
          <Route path="/exams" element={<ExamTypesPage />} />
          <Route path="/subjects" element={<SubjectListPage />} />
          <Route path="/topics" element={<TopicListPage />} />
          <Route path="/quizzes" element={<QuizListPage />} />
          <Route path="/quizzes/:id" element={<QuizDetailPage />} />
          <Route path="/results" element={<ResultPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/upload" element={<AdminUpload />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}
