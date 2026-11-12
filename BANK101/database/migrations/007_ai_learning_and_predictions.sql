-- 007_ai_learning_and_predictions.sql -- Grounded AI Learning, Study Planner & Three-Tier Marks
-- Anchors AI tutoring to official syllabuses & textbooks; separates official vs platform vs predicted marks

-- ── 1. AI Tutor Sessions & Grounded Conversations ─────────────────────────────
CREATE TABLE IF NOT EXISTS ai_tutor_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id     INT REFERENCES exams(id) ON DELETE SET NULL,
    topic_id    INT REFERENCES topics(id) ON DELETE SET NULL,
    language    VARCHAR(10) DEFAULT 'en',  -- 'en' or 'ta'
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_tutor_messages (
    id          SERIAL PRIMARY KEY,
    session_id  INT REFERENCES ai_tutor_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL,      -- 'user' | 'assistant' | 'system'
    content     TEXT NOT NULL,
    citations   TEXT DEFAULT '[]',          -- Stored as JSON string of citations
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Dynamic Study Planner ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_plans (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id             INT REFERENCES exams(id) ON DELETE CASCADE,
    target_exam_date    DATE NOT NULL,
    daily_study_hours   INT DEFAULT 3,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, exam_id)
);

CREATE TABLE IF NOT EXISTS study_plan_items (
    id                  SERIAL PRIMARY KEY,
    plan_id             INT REFERENCES study_plans(id) ON DELETE CASCADE,
    topic_id            INT REFERENCES topics(id) ON DELETE CASCADE,
    scheduled_date      DATE NOT NULL,
    target_questions    INT DEFAULT 20,
    is_completed        BOOLEAN DEFAULT FALSE,
    notes               TEXT
);

-- ── 3. Student Topic Weakness Detector ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_weaknesses (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    topic_id            INT REFERENCES topics(id) ON DELETE CASCADE,
    total_attempted     INT DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) DEFAULT 0,
    weakness_severity   VARCHAR(20) DEFAULT 'medium', -- 'high' | 'medium' | 'low'
    last_assessed_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, topic_id)
);

-- ── 4. Three-Tier Marks System ────────────────────────────────────────────────
-- Tier A: Official Results (Published government marks statement)
CREATE TABLE IF NOT EXISTS official_results (
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

-- Tier C: AI Predicted Scores (Estimated score range with uncertainty indicator)
CREATE TABLE IF NOT EXISTS predicted_scores (
    id                          SERIAL PRIMARY KEY,
    user_id                     INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id                     INT REFERENCES exams(id) ON DELETE CASCADE,
    predicted_min               NUMERIC(6,2) NOT NULL,
    predicted_max               NUMERIC(6,2) NOT NULL,
    confidence_interval         NUMERIC(3,2) DEFAULT 0.85,
    readiness_score             INT DEFAULT 75, -- 0-100 percentage
    assessed_from_attempts_count INT DEFAULT 1,
    calculated_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_ai_sessions_user ON ai_tutor_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_messages_session ON ai_tutor_messages (session_id);
CREATE INDEX IF NOT EXISTS ix_study_plans_user ON study_plans (user_id);
CREATE INDEX IF NOT EXISTS ix_study_items_plan ON study_plan_items (plan_id, scheduled_date);
CREATE INDEX IF NOT EXISTS ix_student_weakness_user ON student_weaknesses (user_id);
CREATE INDEX IF NOT EXISTS ix_predicted_scores_user ON predicted_scores (user_id, exam_id);
CREATE INDEX IF NOT EXISTS ix_official_results_user ON official_results (user_id, exam_id);

