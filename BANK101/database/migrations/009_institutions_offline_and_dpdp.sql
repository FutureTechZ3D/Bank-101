-- 009_institutions_offline_and_dpdp.sql -- Institutional Workspaces, Offline Sync & DPDP Compliance
-- Enables coaching center multi-tenancy, cohort management, offline attempt ingestion, and Indian DPDP Act rights.

-- ── 1. Institutions & Multi-Tenancy ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    code            VARCHAR(50) UNIQUE NOT NULL,
    address         TEXT,
    state_id        INT REFERENCES states(id) ON DELETE SET NULL,
    contact_email   VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'pro', -- 'basic' | 'pro' | 'enterprise'
    is_verified     BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institution_members (
    id              SERIAL PRIMARY KEY,
    institution_id  INT REFERENCES institutions(id) ON DELETE CASCADE,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'student', -- 'admin' | 'faculty' | 'student'
    joined_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (institution_id, user_id)
);

CREATE TABLE IF NOT EXISTS institution_batches (
    id              SERIAL PRIMARY KEY,
    institution_id  INT REFERENCES institutions(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    target_exam_id  INT REFERENCES exams(id) ON DELETE SET NULL,
    academic_year   VARCHAR(50) DEFAULT '2026-2027',
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_students (
    id              SERIAL PRIMARY KEY,
    batch_id        INT REFERENCES institution_batches(id) ON DELETE CASCADE,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    enrollment_no   VARCHAR(100),
    enrolled_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_id, user_id)
);

CREATE TABLE IF NOT EXISTS batch_assigned_tests (
    id              SERIAL PRIMARY KEY,
    batch_id        INT REFERENCES institution_batches(id) ON DELETE CASCADE,
    quiz_id         INT REFERENCES quiz_tests(id) ON DELETE CASCADE,
    assigned_by     INT REFERENCES users(id) ON DELETE SET NULL,
    available_from  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deadline        TIMESTAMPTZ,
    is_mandatory    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_id, quiz_id)
);

-- ── 2. Offline Preparation & Sync Ingestion ───────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    client_attempt_uuid VARCHAR(100) UNIQUE NOT NULL,
    quiz_id             INT REFERENCES quiz_tests(id) ON DELETE CASCADE,
    total_answers       INT NOT NULL DEFAULT 0,
    client_started_at   TIMESTAMPTZ NOT NULL,
    client_submitted_at TIMESTAMPTZ NOT NULL,
    sync_status         VARCHAR(50) DEFAULT 'synced', -- 'pending' | 'synced' | 'conflict'
    synced_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Indian DPDP Act (Digital Personal Data Protection) Compliance ─────────
CREATE TABLE IF NOT EXISTS dpdp_consent_records (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    purpose_code        VARCHAR(100) NOT NULL, -- 'EXAM_EVALUATION' | 'AI_PERSONALIZATION' | 'COMMUNICATION'
    consent_given       BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address          VARCHAR(100),
    user_agent          TEXT,
    consent_timestamp   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id                  SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    request_type        VARCHAR(50) NOT NULL, -- 'DATA_EXPORT' | 'DATA_ERASURE' | 'CONSENT_REVOCATION'
    status              VARCHAR(50) DEFAULT 'completed', -- 'pending' | 'processing' | 'completed' | 'rejected'
    resolution_notes    TEXT,
    requested_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_inst_members_user ON institution_members (user_id);
CREATE INDEX IF NOT EXISTS ix_batch_students_batch ON batch_students (batch_id);
CREATE INDEX IF NOT EXISTS ix_offline_sync_user ON offline_sync_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_dpdp_consent_user ON dpdp_consent_records (user_id);

-- ── 5. Seed Initial Institutional Coaching Workspaces ─────────────────────────
INSERT INTO institutions (name, slug, code, address, contact_email, subscription_tier, is_verified)
VALUES
('Chennai IAS & TNPSC Academy', 'chennai-ias-academy', 'CIA_TN', 'Anna Nagar West, Chennai, Tamil Nadu - 600040', 'contact@chennaiias.in', 'enterprise', TRUE),
('National Bankers Institute', 'national-bankers-inst', 'NBI_HQ', 'MG Road, Bengaluru, Karnataka - 560001', 'support@nbi-india.org', 'pro', TRUE)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO institution_batches (institution_id, name, target_exam_id, academic_year)
SELECT inst.id, b.name, ex.id, b.ay
FROM (VALUES
  ('chennai-ias-academy', 'TNPSC Group 1 Weekend Super 50', 'tnpsc-group-1', '2026-2027'),
  ('chennai-ias-academy', 'TNPSC Group 4 Fast-Track Batch', 'tnpsc-group-4', '2026'),
  ('national-bankers-inst', 'IBPS PO & SBI PO Comprehensive Morning Batch', 'ibps-po', '2026-2027')
) AS b(inst_slug, name, exam_slug, ay)
JOIN institutions inst ON inst.slug = b.inst_slug
JOIN exams ex ON ex.slug = b.exam_slug
ON CONFLICT DO NOTHING;
