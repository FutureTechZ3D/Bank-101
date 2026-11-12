-- PostgreSQL Database Schema for BANK-101
-- The database MUST be UTF8 (questions contain symbols such as ÷ × √). Create it with:
--   CREATE DATABASE bank101 ENCODING 'UTF8' TEMPLATE template0;

-- Drop tables if they exist (for easy teardown/setup)
DROP TABLE IF EXISTS leaderboards CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS hint_usage CASCADE;
DROP TABLE IF EXISTS attempt_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_question_map CASCADE;
DROP TABLE IF EXISTS quiz_tests CASCADE;
DROP TABLE IF EXISTS explanations CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS question_bank CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS exam_types CASCADE;
DROP TABLE IF EXISTS exam_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    account_type VARCHAR(20) DEFAULT 'Free', -- 'Free' or 'Pro'
    google_id VARCHAR(255) NULL,
    points INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exam Categories Table
CREATE TABLE exam_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100) NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Exam Types Table
CREATE TABLE exam_types (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES exam_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL -- e.g., 'Preliminary Exam', 'Main Exam'
);

-- 4. Subjects Table
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    exam_type_id INT REFERENCES exam_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Simplification', 'Reasoning'
    sort_order INT DEFAULT 0
);

-- 5. Topics Table
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'medium'
);

-- 6. Question Bank Table
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'medium',
    year INT NULL,
    language VARCHAR(20) DEFAULT 'English',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    question_type VARCHAR(30) DEFAULT 'single_mcq',  -- 'single_mcq' | 'multi_mcq' | 'true_false' | 'numerical' | 'match' | 'passage'
    numerical_answer NUMERIC(12,4) NULL,
    numerical_tolerance NUMERIC(12,4) DEFAULT 0.001,
    passage_text TEXT NULL
);

-- 7. Options Table
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    label CHAR(1) NOT NULL, -- 'A'-'D', or 'E' on five-option questions
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE
);

-- 8. Explanations Table
CREATE TABLE explanations (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE UNIQUE,
    short_answer TEXT NOT NULL, -- e.g., 'Correct Answer: B'
    detailed_text TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE
);

-- 9. Quiz Tests Table
CREATE TABLE quiz_tests (
    id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Quiz Test 1'
    total_qs INT DEFAULT 50,
    duration_mins INT DEFAULT 50,
    year INT NULL,
    negative_marks DECIMAL(4,2) DEFAULT 0,        -- marks deducted per wrong answer
    marks_per_question DECIMAL(4,2) DEFAULT 1     -- marks awarded per correct answer
);

-- 10. Quiz Question Map Table
CREATE TABLE quiz_question_map (
    quiz_id INT REFERENCES quiz_tests(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    PRIMARY KEY (quiz_id, question_id)
);

-- 11. Quiz Attempts Table
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INT REFERENCES quiz_tests(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    score INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress'  -- 'in_progress' | 'submitted' | 'expired' | 'abandoned'
);

-- 12. Attempt Answers Table
CREATE TABLE attempt_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    selected_option CHAR(1) NULL,  -- 'A'-'D', or 'E' on five-option questions
    text_answer TEXT NULL,
    marked_for_review BOOLEAN DEFAULT FALSE,
    marks_earned NUMERIC(6,2) DEFAULT 0,
    is_correct BOOLEAN DEFAULT FALSE,
    time_taken_seconds INT DEFAULT 0
);

-- 13. Hint Usage Table
CREATE TABLE hint_usage (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quiz_attempt_id INT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Results Table
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    attempt_id INT REFERENCES quiz_attempts(id) ON DELETE CASCADE UNIQUE,
    total INT NOT NULL,
    correct INT NOT NULL,
    wrong INT NOT NULL,
    unanswered INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL
);

-- 15. Certificates Table
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INT REFERENCES quiz_tests(id) ON DELETE CASCADE,
    cert_number VARCHAR(100) UNIQUE NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. Leaderboards Table
CREATE TABLE leaderboards (
    id SERIAL PRIMARY KEY,
    quiz_id INT REFERENCES quiz_tests(id) ON DELETE CASCADE NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    rank INT NOT NULL,
    period VARCHAR(50) DEFAULT 'all' -- 'daily', 'weekly', 'all'
);

-- ═════════════════════════════════════════════════════════════════════════════
-- Phase 1 & 2 additions (also in migrations 002 + 003 for live-db upgrades)
-- ═════════════════════════════════════════════════════════════════════════════

-- RBAC
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);
CREATE TABLE IF NOT EXISTS permissions (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS user_sessions (
    id                 SERIAL PRIMARY KEY,
    user_id            INT REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at         TIMESTAMP NOT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked            BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schema hardening
CREATE TABLE IF NOT EXISTS result_details (
    id              SERIAL PRIMARY KEY,
    result_id       INT REFERENCES results(id) ON DELETE CASCADE,
    question_id     INT REFERENCES question_bank(id) ON DELETE CASCADE,
    marks_awarded   DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
    is_answered     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS attempt_events (
    id          SERIAL PRIMARY KEY,
    attempt_id  INT REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE SET NULL,
    event_type  VARCHAR(30) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS question_tags (
    id          SERIAL PRIMARY KEY,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    tag         VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS question_media (
    id          SERIAL PRIMARY KEY,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    media_type  VARCHAR(20) NOT NULL,
    url         TEXT NOT NULL,
    alt_text    TEXT
);
CREATE TABLE IF NOT EXISTS study_materials (
    id         SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    content    TEXT,
    file_url   TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS previous_papers (
    id           SERIAL PRIMARY KEY,
    exam_type_id INT REFERENCES exam_types(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    year         INT,
    file_url     TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookmarks (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, question_id)
);
CREATE TABLE IF NOT EXISTS announcements (
    id        SERIAL PRIMARY KEY,
    title     VARCHAR(255) NOT NULL,
    body      TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    body       TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT,
    details     TEXT,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS datasets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dataset_versions (
    id         SERIAL PRIMARY KEY,
    dataset_id INT REFERENCES datasets(id) ON DELETE CASCADE,
    version    INT NOT NULL DEFAULT 1,
    file_url   TEXT,
    status     VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dataset_imports (
    id            SERIAL PRIMARY KEY,
    dataset_id    INT REFERENCES datasets(id) ON DELETE CASCADE,
    imported_by   INT REFERENCES users(id) ON DELETE SET NULL,
    total_rows    INT DEFAULT 0,
    imported_rows INT DEFAULT 0,
    failed_rows   INT DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'pending',
    started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at  TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dataset_import_errors (
    id        SERIAL PRIMARY KEY,
    import_id INT REFERENCES dataset_imports(id) ON DELETE CASCADE,
    row_number INT,
    error_msg TEXT NOT NULL,
    raw_data  TEXT
);


-- ── Universal Examination Taxonomy (Phase 1) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
    id          SERIAL PRIMARY KEY,
    iso_code    VARCHAR(3) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
    id          SERIAL PRIMARY KEY,
    country_id  INT REFERENCES countries(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(10) NOT NULL,
    is_national BOOLEAN DEFAULT FALSE,
    UNIQUE (country_id, code)
);

CREATE TABLE IF NOT EXISTS exam_authorities (
    id          SERIAL PRIMARY KEY,
    state_id    INT REFERENCES states(id) ON DELETE SET NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    website_url TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exams (
    id                  SERIAL PRIMARY KEY,
    authority_id        INT REFERENCES exam_authorities(id) ON DELETE RESTRICT,
    category_id         INT REFERENCES exam_categories(id) ON DELETE SET NULL,
    code                VARCHAR(50) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) UNIQUE NOT NULL,
    description         TEXT,
    eligibility_summary TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_stages (
    id              SERIAL PRIMARY KEY,
    exam_id         INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_order     INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    pattern_summary TEXT,
    UNIQUE (exam_id, stage_order)
);

CREATE TABLE IF NOT EXISTS papers (
    id                      SERIAL PRIMARY KEY,
    stage_id                INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    paper_number            INT NOT NULL,
    title                   VARCHAR(255) NOT NULL,
    duration_minutes        INT NOT NULL DEFAULT 60,
    total_marks             DECIMAL(6,2) NOT NULL DEFAULT 100,
    negative_marking_ratio  DECIMAL(4,2) DEFAULT 0,
    UNIQUE (stage_id, paper_number)
);

CREATE TABLE IF NOT EXISTS syllabuses (
    id                      SERIAL PRIMARY KEY,
    exam_id                 INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_id                INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    version_label           VARCHAR(50) NOT NULL,
    effective_from          DATE DEFAULT CURRENT_DATE,
    effective_until         DATE,
    is_active               BOOLEAN DEFAULT TRUE,
    source_notification_url TEXT,
    created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
    id          SERIAL PRIMARY KEY,
    subject_id  INT REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE (subject_id, unit_number)
);

CREATE TABLE IF NOT EXISTS subtopics (
    id                  SERIAL PRIMARY KEY,
    topic_id            INT REFERENCES topics(id) ON DELETE CASCADE,
    unit_id             INT REFERENCES units(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    learning_outcomes   TEXT
);

CREATE TABLE IF NOT EXISTS exam_subject_map (
    id          SERIAL PRIMARY KEY,
    exam_id     INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_id    INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    subject_id  INT REFERENCES subjects(id) ON DELETE CASCADE,
    weightage_percent INT DEFAULT 0,
    UNIQUE (exam_id, stage_id, subject_id)
);
