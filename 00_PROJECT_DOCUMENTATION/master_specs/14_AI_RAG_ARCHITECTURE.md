# 14 — Grounded AI & Three-Tier Scorecard Architecture

## 1. Executive Summary
BANK-101 implements an academic-first, syllabus-anchored AI Learning Engine. Unlike unconstrained consumer LLM chatbots, BANK-101 AI is strictly grounded in official examination syllabuses, verified government & open-source textbooks (NCERT, Tamil Nadu SCERT, OpenStax), and official previous-year papers (PYQ).

---

## 2. Core Tenets
1. **Zero Hallucination Anchoring**: Queries retrieve syllabus units, textbook chapters (with page ranges), and verified PYQs before generating responses.
2. **Bilingual Instruction (English & தமிழ்)**: Full dual-language conversational support tailored to Tamil Nadu state aspirants (TNPSC/TRB) and national aspirants (UPSC/SSC/IBPS).
3. **Strict Three-Tier Marks Separation**:
   - **Tier A: Official Results**: Published government gazette/commission statement with verified roll number and rank.
   - **Tier B: Platform Assessed Score**: Real-time CBT mock test percentage and accuracy.
   - **Tier C: AI Predicted Score**: Statistical readiness range ($[min, max]$) with an 85% confidence interval and progress gauge.
4. **Adaptive Syllabus Study Planner**: Evenly distributes remaining examination topics between today and the candidate's target examination date.

---

## 3. Data Schema (Migration `007_ai_learning_and_predictions.sql`)

```sql
-- AI Sessions & Grounded Messages
CREATE TABLE ai_tutor_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id     INT REFERENCES exams(id) ON DELETE SET NULL,
    topic_id    INT REFERENCES topics(id) ON DELETE SET NULL,
    language    VARCHAR(10) DEFAULT 'en',
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_tutor_messages (
    id          SERIAL PRIMARY KEY,
    session_id  INT REFERENCES ai_tutor_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL,
    content     TEXT NOT NULL,
    citations   TEXT DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Adaptive Study Planner
CREATE TABLE study_plans (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id             INT REFERENCES exams(id) ON DELETE CASCADE,
    target_exam_date    DATE NOT NULL,
    daily_study_hours   INT DEFAULT 3,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, exam_id)
);

CREATE TABLE study_plan_items (
    id                  SERIAL PRIMARY KEY,
    plan_id             INT REFERENCES study_plans(id) ON DELETE CASCADE,
    topic_id            INT REFERENCES topics(id) ON DELETE CASCADE,
    scheduled_date      DATE NOT NULL,
    target_questions    INT DEFAULT 20,
    is_completed        BOOLEAN DEFAULT FALSE,
    notes               TEXT
);

-- Three-Tier Scorecard Entities
CREATE TABLE official_results (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id             INT REFERENCES exams(id) ON DELETE CASCADE,
    roll_number         VARCHAR(100),
    official_marks      NUMERIC(6,2) NOT NULL,
    total_marks         NUMERIC(6,2) NOT NULL DEFAULT 300,
    rank_achieved       INT,
    publication_date    DATE,
    proof_url           TEXT,
    is_verified         BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predicted_scores (
    id                          SERIAL PRIMARY KEY,
    user_id                     INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id                     INT REFERENCES exams(id) ON DELETE CASCADE,
    predicted_min               NUMERIC(6,2) NOT NULL,
    predicted_max               NUMERIC(6,2) NOT NULL,
    confidence_interval         NUMERIC(3,2) DEFAULT 0.85,
    readiness_score             INT DEFAULT 75,
    assessed_from_attempts_count INT DEFAULT 1,
    calculated_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/tutor/ask` | Sends query to grounded tutor, returning citations and dual-language response |
| `GET` | `/api/v1/ai/tutor/sessions` | Lists user's past AI consultations |
| `GET` | `/api/v1/ai/tutor/sessions/:id` | Retrieves full conversation history with structured citations |
| `POST` | `/api/v1/ai/study-plan/generate` | Generates or recalibrates syllabus schedule against target exam date |
| `GET` | `/api/v1/ai/study-plan/:examId` | Fetches active study plan with completion metrics |
| `PATCH` | `/api/v1/ai/study-plan/items/:itemId` | Toggles item completion checkbox |
| `GET` | `/api/v1/ai/performance-lab/:examId` | Fetches Three-Tier Scorecard (Tier A Official, Tier B Platform, Tier C AI Predicted) |
| `POST` | `/api/v1/ai/performance-lab/official-result` | Logs verified government result statement |

---

## 5. Verification & Test Suite
Automated regression tests are verified against PostgreSQL 18.6 in `backend/tests/ai_learning.test.ts`:
- Textbook chapter retrieval & metadata formatting
- Dual-language Tamil (`ta`) and English (`en`) responses
- Persistent multi-turn session recall
- Syllabus calendar pacing with completion status updates
- Three-tier marks separation and confidence interval validation

