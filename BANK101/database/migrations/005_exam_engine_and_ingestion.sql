-- 005_exam_engine_and_ingestion.sql -- Reusable Exam Engine & Multi-Question Types
-- Adds review flags, numerical answer storage, passage context, and scoring enhancements

-- ── 1. Question Bank Enhancements ─────────────────────────────────────────────
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS numerical_answer NUMERIC(12,4);
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS numerical_tolerance NUMERIC(12,4) DEFAULT 0.001;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS passage_text TEXT;

-- ── 2. Attempt Answer Enhancements ────────────────────────────────────────────
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS text_answer TEXT;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS marked_for_review BOOLEAN DEFAULT FALSE;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS marks_earned NUMERIC(6,2) DEFAULT 0;

-- ── 3. Performance Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_question_bank_qtype ON question_bank (question_type);
CREATE INDEX IF NOT EXISTS ix_attempt_answers_review ON attempt_answers (attempt_id, marked_for_review);

