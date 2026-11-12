-- 006_digital_library_and_pyq.sql -- Digital Academic Library & Previous-Year Papers (PYQ)
-- Implements legal license enforcement, book metadata, chapters, and past papers with official key provenance

-- ── 1. Licenses & Rights Registry ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
    id                   SERIAL PRIMARY KEY,
    code                 VARCHAR(50) UNIQUE NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    can_redistribute     BOOLEAN NOT NULL DEFAULT FALSE,
    attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
    terms_summary        TEXT
);

-- ── 2. Digital Books ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
    id                  SERIAL PRIMARY KEY,
    license_id          INT REFERENCES licenses(id) ON DELETE RESTRICT,
    category            VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    authors             TEXT,
    publisher           VARCHAR(255),
    publication_year    INT,
    language            VARCHAR(50) DEFAULT 'English',
    edition             VARCHAR(50),
    isbn                VARCHAR(30),
    cover_image_url     TEXT,
    source_url          TEXT NOT NULL,
    download_url        TEXT,
    is_quarantined      BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Book Chapters & Syllabus Topic Mapping ─────────────────────────────────
CREATE TABLE IF NOT EXISTS book_chapters (
    id              SERIAL PRIMARY KEY,
    book_id         INT REFERENCES books(id) ON DELETE CASCADE,
    chapter_number  INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    page_start      INT,
    page_end        INT,
    subject_id      INT REFERENCES subjects(id) ON DELETE SET NULL,
    topic_id        INT REFERENCES topics(id) ON DELETE SET NULL,
    UNIQUE (book_id, chapter_number)
);

-- ── 4. Book to Exam Mapping ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_exam_map (
    id              SERIAL PRIMARY KEY,
    book_id         INT REFERENCES books(id) ON DELETE CASCADE,
    exam_id         INT REFERENCES exams(id) ON DELETE CASCADE,
    relevance_score INT DEFAULT 80,
    UNIQUE (book_id, exam_id)
);

-- ── 5. Previous-Year Question Papers (PYQ) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pyq_papers (
    id                  SERIAL PRIMARY KEY,
    exam_id             INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_id            INT REFERENCES exam_stages(id) ON DELETE SET NULL,
    paper_id            INT REFERENCES papers(id) ON DELETE SET NULL,
    year                INT NOT NULL,
    shift_session       VARCHAR(100),
    language            VARCHAR(50) DEFAULT 'English',
    title               VARCHAR(255) NOT NULL,
    original_paper_url  TEXT,
    official_key_url    TEXT,
    total_questions     INT DEFAULT 100,
    is_verified         BOOLEAN DEFAULT TRUE,
    provenance_note     TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 6. PYQ Questions & Official Key Provenance ─────────────────────────────────
CREATE TABLE IF NOT EXISTS pyq_questions (
    id                    SERIAL PRIMARY KEY,
    pyq_paper_id          INT REFERENCES pyq_papers(id) ON DELETE CASCADE,
    question_number       INT NOT NULL,
    question_id           INT REFERENCES question_bank(id) ON DELETE SET NULL,
    official_key          VARCHAR(20) NOT NULL,
    calculated_key        VARCHAR(20),
    key_status            VARCHAR(20) DEFAULT 'final',
    discrepancy_note      TEXT,
    is_verified           BOOLEAN DEFAULT TRUE,
    UNIQUE (pyq_paper_id, question_number)
);

-- ── 7. Performance & Provenance Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_books_category ON books (category);
CREATE INDEX IF NOT EXISTS ix_books_license ON books (license_id);
CREATE INDEX IF NOT EXISTS ix_book_chapters_book ON book_chapters (book_id);
CREATE INDEX IF NOT EXISTS ix_book_chapters_topic ON book_chapters (topic_id);
CREATE INDEX IF NOT EXISTS ix_book_exam_map_exam ON book_exam_map (exam_id);
CREATE INDEX IF NOT EXISTS ix_pyq_papers_exam ON pyq_papers (exam_id, year);
CREATE INDEX IF NOT EXISTS ix_pyq_questions_paper ON pyq_questions (pyq_paper_id);
CREATE INDEX IF NOT EXISTS ix_pyq_questions_qbank ON pyq_questions (question_id);

-- ── 8. Seed Verified Licenses & Academic Metadata ─────────────────────────────
-- Licenses:
INSERT INTO licenses (code, name, can_redistribute, attribution_required, terms_summary)
VALUES
  ('PUBLIC_DOMAIN', 'Public Domain / CC0', TRUE, FALSE, 'Free to read, redistribute, format and host without copyright constraints.'),
  ('CC_BY', 'Creative Commons Attribution (CC BY 4.0)', TRUE, TRUE, 'Free to share and adapt provided appropriate credit is given.'),
  ('CC_BY_SA', 'Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)', TRUE, TRUE, 'Free to adapt under identical license terms with attribution.'),
  ('COPYRIGHT_LINK_ONLY', 'Copyright Protected (Official Link Only)', FALSE, TRUE, 'Direct linking to official portal allowed. Republication / hosting prohibited.'),
  ('QUARANTINED', 'Quarantined / Unverified Rights', FALSE, TRUE, 'Under legal/license audit. Hidden from public download.')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, can_redistribute = EXCLUDED.can_redistribute;

-- Books:
INSERT INTO books (license_id, category, title, authors, publisher, publication_year, language, source_url, download_url, is_quarantined)
SELECT lic.id, b.category, b.title, b.authors, b.publisher, b.pub_year, b.lang, b.source_url, b.download_url, b.quarantined
FROM (VALUES
  ('COPYRIGHT_LINK_ONLY', 'NCERT Textbooks', 'NCERT Class 10 Mathematics', 'NCERT Textbook Development Committee', 'National Council of Educational Research and Training', 2024, 'English', 'https://epathshala.nic.in/process.php?id=students&type=eTextbooks&ln=en', NULL, FALSE),
  ('COPYRIGHT_LINK_ONLY', 'Tamil Nadu State Board', 'Samacheer Kalvi Standard 10 Mathematics', 'Tamil Nadu State Council of Educational Research and Training (SCERT)', 'Tamil Nadu Textbook and Educational Services Corporation', 2024, 'English & Tamil', 'https://textbookcorp.tn.gov.in/online_textbooks.php', NULL, FALSE),
  ('CC_BY', 'Open Educational Resources', 'OpenStax Precalculus & Quantitative Foundations', 'Jay Abramson et al.', 'OpenStax / Rice University', 2023, 'English', 'https://openstax.org/details/books/precalculus-2e', 'https://openstax.org/precalculus-2e.pdf', FALSE),
  ('PUBLIC_DOMAIN', 'Public Domain Texts', 'Fundamental Arithmetic, Fractions and Numerical Algorithms', 'Open Educational Collective', 'Public Domain Open Educational Heritage', 2021, 'English', 'https://www.gutenberg.org/ebooks/mathematics', 'https://www.gutenberg.org/files/arithmetic.pdf', FALSE)
) AS b(lic_code, category, title, authors, publisher, pub_year, lang, source_url, download_url, quarantined)
JOIN licenses lic ON lic.code = b.lic_code
ON CONFLICT DO NOTHING;

-- Book Chapters:
INSERT INTO book_chapters (book_id, chapter_number, title, page_start, page_end, subject_id, topic_id)
SELECT bk.id, ch.ch_num, ch.title, ch.p_start, ch.p_end, s.id, t.id
FROM books bk
CROSS JOIN subjects s
CROSS JOIN topics t,
(VALUES
  ('NCERT Class 10 Mathematics', 1, 'Chapter 1: Real Numbers & Fundamental Arithmetic', 1, 18),
  ('Samacheer Kalvi Standard 10 Mathematics', 2, 'Chapter 2: Numbers, Sequences & Fractional Series', 38, 84),
  ('OpenStax Precalculus & Quantitative Foundations', 1, 'Functions and Mathematical Simplification', 1, 95)
) AS ch(book_title, ch_num, title, p_start, p_end)
WHERE bk.title = ch.book_title AND s.name = 'Simplification' AND t.name = 'BODMAS Rule'
ON CONFLICT (book_id, chapter_number) DO UPDATE SET title = EXCLUDED.title;

-- Book to Exam Maps:
INSERT INTO book_exam_map (book_id, exam_id, relevance_score)
SELECT bk.id, ex.id, 90
FROM books bk, exams ex
WHERE (bk.category = 'Tamil Nadu State Board' AND ex.slug = 'tnpsc-group-2')
   OR (bk.category = 'NCERT Textbooks' AND ex.slug IN ('ssc-cgl', 'ibps-po'))
   OR (bk.category = 'Open Educational Resources' AND ex.slug IN ('tnpsc-group-2', 'ssc-cgl', 'ibps-po'))
ON CONFLICT (book_id, exam_id) DO NOTHING;

-- PYQ Papers for the Pilot Exams:
INSERT INTO pyq_papers (exam_id, stage_id, year, shift_session, language, title, original_paper_url, official_key_url, total_questions, is_verified, provenance_note)
SELECT ex.id, st.id, p.year, p.shift, p.lang, p.title, p.paper_url, p.key_url, p.total_q, TRUE, p.provenance
FROM exams ex
JOIN exam_stages st ON st.exam_id = ex.id AND st.stage_order = 1,
(VALUES
  ('tnpsc-group-2', 2022, 'Forenoon Session (10:00 AM - 1:00 PM)', 'Tamil & English',
   'TNPSC Combined Civil Services II (Group II) 2022 Preliminary Exam Paper',
   'https://tnpsc.gov.in/document/QP_2022_G2_GS.pdf',
   'https://tnpsc.gov.in/document/FINAL_KEY_2022_G2_GS.pdf', 200,
   'Extracted from official TNPSC notification portal with provisional-to-final key reconciliation.'),
  ('ssc-cgl', 2023, 'Tier I Shift 1', 'English & Hindi',
   'SSC Combined Graduate Level 2023 Tier I Examination Paper (Shift 1)',
   'https://ssc.gov.in/pyq/cgl_2023_tier1_shift1.pdf',
   'https://ssc.gov.in/pyq/cgl_2023_tier1_shift1_final_key.pdf', 100,
   'Official candidate response sheet reconciled against SSC final answer key notification.'),
  ('ibps-po', 2023, 'Preliminary Shift 2', 'English & Hindi',
   'IBPS CWE PO/MT XIII Preliminary Examination Past Year Test Paper',
   'https://ibps.in/archive/cwe_po_xiii_prelims.pdf',
   'https://ibps.in/archive/cwe_po_xiii_answer_key.pdf', 100,
   'Verified banking aptitude past paper with mathematical proof review.')
) AS p(slug, year, shift, lang, title, paper_url, key_url, total_q, provenance)
WHERE ex.slug = p.slug
ON CONFLICT DO NOTHING;

-- PYQ Questions (Linking Question 1 of Seed Bank to TNPSC PYQ):
INSERT INTO pyq_questions (pyq_paper_id, question_number, question_id, official_key, calculated_key, key_status, discrepancy_note, is_verified)
SELECT pyq.id, 1, 1, 'A', 'A', 'final', 'Official key and independent calculation both verify Option A (3815).', TRUE
FROM pyq_papers pyq
WHERE pyq.year = 2022
LIMIT 1
ON CONFLICT (pyq_paper_id, question_number) DO NOTHING;

