# 05 — Frontend Architecture & Design System

## 1. Overview & Technology Stack
BANK-101's frontend is architected as a high-performance Single Page Application (SPA) designed to withstand high concurrent test-taker load and operate reliably across low-bandwidth environments.

- **Framework**: React 19 + TypeScript (Strict typing enabled)
- **Build Tool**: Vite 6 (Fast HMR, optimized production chunks under 400KB gzip)
- **Styling**: Tailwind CSS + Material Symbols icons + Custom design tokens
- **State Management**: Zustand lightweight store (`authStore.ts`, session caching)
- **Routing**: React Router v7 (`App.tsx`) with strict Route Guards (`RequireAuth`, `RequireAdmin`, `RedirectIfAuth`)

---

## 2. Page & Component Layout Hierarchy

```
App.tsx
├── Public Routes
│   └── /login ➔ LoginPage.tsx
│
├── Student Layout (Sidebar + Header + Content)
│   ├── /dashboard ➔ DashboardPage.tsx
│   ├── /directory ➔ ExamDirectoryPage.tsx (Filterable National & State Catalog)
│   ├── /compare ➔ ExamComparisonPage.tsx (Side-by-side Overlap Matrix)
│   ├── /library ➔ DigitalLibraryPage.tsx (OER Textbooks & License Enforcement)
│   ├── /pyq ➔ PYQRepositoryPage.tsx (Past Papers & Separated Answer Keys)
│   ├── /ai-tutor ➔ AITutorPage.tsx (Bilingual Grounded AI Tutor with Citations)
│   ├── /performance-lab ➔ PerformanceLabPage.tsx (3-Tier Scorecard & Study Plan)
│   ├── /exams ➔ ExamTypesPage.tsx
│   ├── /subjects ➔ SubjectListPage.tsx
│   ├── /topics ➔ TopicListPage.tsx
│   ├── /quizzes ➔ QuizListPage.tsx
│   ├── /quizzes/:id ➔ QuizDetailPage.tsx
│   ├── /results ➔ ResultPage.tsx
│   ├── /leaderboard ➔ LeaderboardPage.tsx
│   ├── /analytics ➔ AnalyticsPage.tsx
│   └── /certificates ➔ CertificatesPage.tsx
│
├── Distraction-Free Exam Room (Full-Screen)
│   └── /exam/:attemptId? ➔ QuizEnginePage.tsx
│       ├── Sticky Server-Synchronized Countdown Timer
│       ├── Multi-Question Type Presenter (MCQ, Five-Option, Numerical)
│       ├── Reconnection & Palette State Restorer (Marked for Review, Answered)
│       └── Emergency Auto-Submit Guard
│
└── Admin Layout (AdminSidebar + Header + Content)
    ├── /admin ➔ AdminDashboard.tsx (Real-time analytics, user tier management)
    └── /admin/upload ➔ AdminUpload.tsx (Atomic CSV/JSON preview & bulk import)
```

---

## 3. CBT Exam Room Engine UX Design

The examination interface adheres to standardized National Testing Agency (NTA) and TCS iON CBT behavioral patterns:
1. **Interactive Question Palette**:
   - 🟢 **Green (Answered)**: Candidate has chosen an option or entered a numerical answer.
   - 🔴 **Red (Unanswered)**: Visited but no option selected.
   - ⚪ **Gray (Not Visited)**: Yet to be viewed.
   - 🟣 **Purple (Marked for Review)**: Flagged for review without an answer.
   - 🟣🟩 **Purple with Green Dot (Answered & Marked for Review)**: Answer evaluated even if not changed.
2. **Resilience & State Recovery**:
   - Reconnecting or refreshing triggers `GET /api/v1/attempts/:id/state`.
   - The palette immediately recovers all previously chosen options and review flags.
3. **Multi-Question Types**:
   - Standard 4-option and 5-option (A–E) radio groups.
   - Numerical input field with floating-point tolerance handling ($x \pm \epsilon$).

---

## 4. Grounded AI Tutor & Performance Lab Design
- **Bilingual Interface Toggle**: Seamless one-click switch between English (`en`) and Tamil (`ta`).
- **Academic Provenance Cards**: Highlight textbook chapter references and previous-year question numbers.
- **Three-Tier Scorecard**: Visual separation between:
  - Official Gazette Results (Tier A)
  - Platform Mock Exam Results (Tier B)
  - AI Statistically Predicted Readiness (Tier C)

