-- 004_universal_taxonomy.sql -- Universal National & State Examination Taxonomy
-- Enables exam-independent, syllabus-driven architecture for India & Tamil Nadu

-- ── 1. Countries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
    id          SERIAL PRIMARY KEY,
    iso_code    VARCHAR(3) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL
);

-- ── 2. States / Union Territories ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS states (
    id          SERIAL PRIMARY KEY,
    country_id  INT REFERENCES countries(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(10) NOT NULL,
    is_national BOOLEAN DEFAULT FALSE,
    UNIQUE (country_id, code)
);

-- ── 3. Examination Authorities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_authorities (
    id          SERIAL PRIMARY KEY,
    state_id    INT REFERENCES states(id) ON DELETE SET NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    website_url TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Unified Examinations ───────────────────────────────────────────────────
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

-- ── 5. Examination Stages (Prelims, Mains, Interview, etc.) ────────────────────
CREATE TABLE IF NOT EXISTS exam_stages (
    id              SERIAL PRIMARY KEY,
    exam_id         INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_order     INT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    pattern_summary TEXT,
    UNIQUE (exam_id, stage_order)
);

-- ── 6. Papers per Stage ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS papers (
    id                      SERIAL PRIMARY KEY,
    stage_id                INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    paper_number            INT NOT NULL,
    title                   VARCHAR(255) NOT NULL,
    duration_minutes        INT NOT NULL DEFAULT 60,
    total_marks             NUMERIC(6,2) NOT NULL DEFAULT 100,
    negative_marking_ratio  NUMERIC(4,2) DEFAULT 0,
    UNIQUE (stage_id, paper_number)
);

-- ── 7. Versioned Syllabuses ───────────────────────────────────────────────────
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

-- ── 8. Units (Hierarchical Syllabus Section) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
    id          SERIAL PRIMARY KEY,
    subject_id  INT REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE (subject_id, unit_number)
);

-- ── 9. Subtopics (Fine-Grained Learning Outcome) ──────────────────────────────
CREATE TABLE IF NOT EXISTS subtopics (
    id                  SERIAL PRIMARY KEY,
    topic_id            INT REFERENCES topics(id) ON DELETE CASCADE,
    unit_id             INT REFERENCES units(id) ON DELETE SET NULL,
    title               VARCHAR(255) NOT NULL,
    learning_outcomes   TEXT
);

-- ── 10. Exam to Subject Mapping (Multi-Exam Syllabus Reusability) ─────────────
CREATE TABLE IF NOT EXISTS exam_subject_map (
    id          SERIAL PRIMARY KEY,
    exam_id     INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_id    INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    subject_id  INT REFERENCES subjects(id) ON DELETE CASCADE,
    weightage_percent INT DEFAULT 0,
    UNIQUE (exam_id, stage_id, subject_id)
);

-- ── 11. Indexes for Fast Hierarchy & Cross-Exam Navigation ────────────────────
CREATE INDEX IF NOT EXISTS ix_states_country ON states (country_id);
CREATE INDEX IF NOT EXISTS ix_authorities_state ON exam_authorities (state_id);
CREATE INDEX IF NOT EXISTS ix_exams_authority ON exams (authority_id);
CREATE INDEX IF NOT EXISTS ix_exams_category ON exams (category_id);
CREATE INDEX IF NOT EXISTS ix_exam_stages_exam ON exam_stages (exam_id);
CREATE INDEX IF NOT EXISTS ix_papers_stage ON papers (stage_id);
CREATE INDEX IF NOT EXISTS ix_syllabuses_exam ON syllabuses (exam_id);
CREATE INDEX IF NOT EXISTS ix_units_subject ON units (subject_id);
CREATE INDEX IF NOT EXISTS ix_subtopics_topic ON subtopics (topic_id);
CREATE INDEX IF NOT EXISTS ix_exam_submap_exam ON exam_subject_map (exam_id);

-- ── 12. Seed Data for Pilot Examination Ecosystem ─────────────────────────────
-- Country:
INSERT INTO countries (iso_code, name) VALUES ('IND', 'India')
ON CONFLICT (iso_code) DO NOTHING;

-- States:
INSERT INTO states (country_id, name, code, is_national)
SELECT c.id, s.name, s.code, s.is_national
FROM countries c,
(VALUES
  ('Central / All-India', 'CEN', TRUE),
  ('Tamil Nadu', 'TN', FALSE),
  ('Karnataka', 'KA', FALSE),
  ('Kerala', 'KL', FALSE),
  ('Maharashtra', 'MH', FALSE),
  ('Delhi (NCT)', 'DL', FALSE)
) AS s(name, code, is_national)
WHERE c.iso_code = 'IND'
ON CONFLICT (country_id, code) DO NOTHING;

-- Authorities:
INSERT INTO exam_authorities (state_id, code, name, website_url, description)
SELECT s.id, a.code, a.name, a.url, a.descr
FROM (VALUES
  ('CEN', 'UPSC', 'Union Public Service Commission', 'https://upsc.gov.in', 'Apex civil services and central examinations authority'),
  ('CEN', 'SSC', 'Staff Selection Commission', 'https://ssc.gov.in', 'Recruitment for Group B and C posts in Ministries and Departments'),
  ('CEN', 'IBPS', 'Institute of Banking Personnel Selection', 'https://ibps.in', 'Premier banking and public financial recruitment agency'),
  ('CEN', 'RRB', 'Railway Recruitment Board', 'https://indianrailways.gov.in', 'Recruitment agency for Indian Railways cadres'),
  ('CEN', 'NTA', 'National Testing Agency', 'https://nta.ac.in', 'Specialist entrance exam testing authority for NEET, JEE, CUET'),
  ('TN', 'TNPSC', 'Tamil Nadu Public Service Commission', 'https://tnpsc.gov.in', 'Premier constitutional recruiting authority for Tamil Nadu state services'),
  ('TN', 'TRB', 'Teachers Recruitment Board (Tamil Nadu)', 'https://trb.tn.gov.in', 'Recruitment of teachers, lecturers and professors in Tamil Nadu'),
  ('TN', 'TNUSRB', 'Tamil Nadu Uniformed Services Recruitment Board', 'https://tnusrb.tn.gov.in', 'Recruitment for Police, Fire and Prison services in Tamil Nadu')
) AS a(scode, code, name, url, descr)
JOIN states s ON s.code = a.scode
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, website_url = EXCLUDED.website_url;

-- Exams:
INSERT INTO exams (authority_id, category_id, code, title, slug, description, eligibility_summary)
SELECT auth.id, cat.id, e.code, e.title, e.slug, e.description, e.eligibility
FROM (VALUES
  ('TNPSC', 'State PSC', 'TNPSC_G2', 'TNPSC Combined Civil Services Examination II (Group II / IIA)', 'tnpsc-group-2',
   'Recruitment for prestigious Group II executive and non-executive posts in Tamil Nadu state administration.',
   'Bachelor degree from recognized university. Age 18-32 (relaxations for reserved categories). Tamil language proficiency required.'),
  ('SSC', 'SSC Exams', 'SSC_CGL', 'SSC Combined Graduate Level Examination (CGL)', 'ssc-cgl',
   'Central recruitment for Group B and C gazetted and non-gazetted ministerial posts across India.',
   'Bachelor degree. Age 18-30/32 depending on post. All-India eligibility.'),
  ('IBPS', 'Bank Exams', 'IBPS_PO', 'IBPS Probationary Officers / Management Trainees (CWE PO/MT)', 'ibps-po',
   'National recruitment examination for Probationary Officers across 11 participating public sector banks.',
   'Graduation in any discipline. Age 20-30 years. Computer literacy required.')
) AS e(auth_code, cat_name, code, title, slug, description, eligibility)
JOIN exam_authorities auth ON auth.code = e.auth_code
LEFT JOIN exam_categories cat ON cat.name = e.cat_name
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, eligibility_summary = EXCLUDED.eligibility_summary;

-- Exam Stages:
INSERT INTO exam_stages (exam_id, stage_order, name, pattern_summary)
SELECT ex.id, st.s_order, st.name, st.pattern
FROM exams ex,
(VALUES
  ('tnpsc-group-2', 1, 'Preliminary Examination', 'Objective type: 200 questions, 300 marks, 3 hours duration. General Studies (75) + Aptitude (25) + General Tamil/English (100).'),
  ('tnpsc-group-2', 2, 'Main Written Examination', 'Descriptive type: Paper I (Mandatory Tamil Eligibility) + Paper II (General Studies Degree Standard).'),
  ('ssc-cgl', 1, 'Tier I (CBT Computer Based Test)', 'Objective type: 100 questions (200 marks), 60 mins. Reasoning (25), GA (25), Quant (25), English (25). Negative 0.50 marks.'),
  ('ssc-cgl', 2, 'Tier II (CBT Examination)', 'Session I (135 mins): Mathematical Abilities (30), Reasoning (30), English (45), GA (25), Computer (20).'),
  ('ibps-po', 1, 'Preliminary Examination', 'Objective type: 100 questions (100 marks), 60 mins sectional timing. English (30), Quant (35), Reasoning (35). Negative 0.25 marks.'),
  ('ibps-po', 2, 'Main Examination', 'Objective (200 marks, 180 mins) + Descriptive (English Letter & Essay, 25 marks, 30 mins).')
) AS st(slug, s_order, name, pattern)
WHERE ex.slug = st.slug
ON CONFLICT (exam_id, stage_order) DO UPDATE SET name = EXCLUDED.name, pattern_summary = EXCLUDED.pattern_summary;

-- Papers:
INSERT INTO papers (stage_id, paper_number, title, duration_minutes, total_marks, negative_marking_ratio)
SELECT st.id, p.p_num, p.title, p.duration, p.total_marks, p.neg_ratio
FROM exam_stages st
JOIN exams ex ON ex.id = st.exam_id,
(VALUES
  ('tnpsc-group-2', 1, 1, 'General Studies, Aptitude and Language', 180, 300, 0.0),
  ('ssc-cgl', 1, 1, 'Tier I Combined Assessment', 60, 200, 0.50),
  ('ibps-po', 1, 1, 'Prelims Objective Assessment', 60, 100, 0.25)
) AS p(slug, stage_order, p_num, title, duration, total_marks, neg_ratio)
WHERE ex.slug = p.slug AND st.stage_order = p.stage_order
ON CONFLICT (stage_id, paper_number) DO UPDATE SET title = EXCLUDED.title, duration_minutes = EXCLUDED.duration_minutes;

-- Versioned Syllabuses:
INSERT INTO syllabuses (exam_id, stage_id, version_label, is_active, source_notification_url)
SELECT ex.id, st.id, '2025-2026 Official Notification', TRUE, ex.slug || '-notification'
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id AND st.stage_order = 1
ON CONFLICT DO NOTHING;

-- Units & Subtopics (linking to existing Simplification subject/topic):
INSERT INTO units (subject_id, unit_number, title, description)
SELECT s.id, 1, 'Unit I: Numerical Aptitude & Simplification', 'Foundational arithmetic, fractions, square roots, and rapid mental calculation.'
FROM subjects s WHERE s.name = 'Simplification'
ON CONFLICT (subject_id, unit_number) DO NOTHING;

INSERT INTO subtopics (topic_id, unit_id, title, learning_outcomes)
SELECT t.id, u.id, 'BODMAS & Fractional Arithmetic', 'Master order of operations, exact fractions, roots and algebraic simplifications.'
FROM topics t
JOIN subjects s ON s.id = t.subject_id AND s.name = 'Simplification'
JOIN units u ON u.subject_id = s.id AND u.unit_number = 1
LIMIT 1
ON CONFLICT DO NOTHING;

-- Map Subjects to Exams for the Cross-Exam Engine:
INSERT INTO exam_subject_map (exam_id, stage_id, subject_id, weightage_percent)
SELECT ex.id, st.id, s.id, 25
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id AND st.stage_order = 1
CROSS JOIN subjects s
WHERE s.name = 'Simplification'
ON CONFLICT (exam_id, stage_id, subject_id) DO NOTHING;

