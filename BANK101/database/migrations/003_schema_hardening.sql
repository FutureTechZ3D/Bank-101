-- 003_schema_hardening.sql -- Schema hardening for live database upgrades
-- Apply after 002_rbac.sql on a live database.
-- Fresh installs use schema.sql which already includes all these changes.

-- ── 1. attempt status on quiz_attempts ───────────────────────────────────────
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'in_progress';
UPDATE quiz_attempts SET status = 'submitted' WHERE submitted_at IS NOT NULL AND status = 'in_progress';
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_status ON quiz_attempts (status);
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_user_status ON quiz_attempts (user_id, status);

-- ── 2. Negative marking on quiz_tests ────────────────────────────────────────
ALTER TABLE quiz_tests ADD COLUMN IF NOT EXISTS negative_marks NUMERIC DEFAULT 0;
ALTER TABLE quiz_tests ADD COLUMN IF NOT EXISTS marks_per_question NUMERIC DEFAULT 1;

-- ── 3. Question type on question_bank ────────────────────────────────────────
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'single_mcq';

-- ── 4. FK indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_exam_types_category   ON exam_types   (category_id);
CREATE INDEX IF NOT EXISTS ix_subjects_exam_type    ON subjects     (exam_type_id);
CREATE INDEX IF NOT EXISTS ix_topics_subject        ON topics       (subject_id);
CREATE INDEX IF NOT EXISTS ix_question_bank_topic   ON question_bank (topic_id);
CREATE INDEX IF NOT EXISTS ix_options_question      ON options      (question_id);
CREATE INDEX IF NOT EXISTS ix_explanations_question ON explanations (question_id);
CREATE INDEX IF NOT EXISTS ix_quiz_tests_topic      ON quiz_tests   (topic_id);
CREATE INDEX IF NOT EXISTS ix_quiz_qmap_question    ON quiz_question_map (question_id);
CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz    ON quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS ix_attempt_answers_q     ON attempt_answers (question_id);
CREATE INDEX IF NOT EXISTS ix_hint_usage_question   ON hint_usage   (question_id);
CREATE INDEX IF NOT EXISTS ix_results_attempt       ON results      (attempt_id);
CREATE INDEX IF NOT EXISTS ix_certificates_user     ON certificates (user_id);
CREATE INDEX IF NOT EXISTS ix_certificates_quiz     ON certificates (quiz_id);
CREATE INDEX IF NOT EXISTS ix_leaderboards_quiz     ON leaderboards (quiz_id);
CREATE INDEX IF NOT EXISTS ix_leaderboards_user     ON leaderboards (user_id);

-- ── 5. New tables (live database: already in schema.sql for fresh installs) ───
CREATE TABLE IF NOT EXISTS result_details (
    id              SERIAL PRIMARY KEY,
    result_id       INT REFERENCES results(id) ON DELETE CASCADE,
    question_id     INT REFERENCES question_bank(id) ON DELETE CASCADE,
    marks_awarded   NUMERIC NOT NULL DEFAULT 0,
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

-- ── 6. Seed default system_settings ───────────────────────────────────────────
INSERT INTO system_settings (key, value, description) VALUES
  ('daily_mock_enabled', 'false', 'Enable the daily mock test feature'),
  ('max_free_hints', '10', 'Number of hints allowed per quiz for free users'),
  ('cert_pass_threshold', '80', 'Minimum percentage to earn a certificate')
ON CONFLICT (key) DO NOTHING;
