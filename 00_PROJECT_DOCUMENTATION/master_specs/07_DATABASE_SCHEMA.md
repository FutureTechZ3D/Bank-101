# 07 — Universal Database Schema Architecture
## BANK-101 Relational & Analytical Schema Design (PostgreSQL)

---

## 1. Schema Evolution Strategy

The system evolves cleanly from the working hardened baseline to the enterprise multi-authority platform without breaking existing tables or test suites.

```
Existing Tables (Preserved):
  users, user_roles, roles, permissions, role_permissions, refresh_tokens
  exam_categories, exam_types, subjects, topics, quiz_tests, question_bank,
  options, explanations, quiz_question_map, quiz_attempts, attempt_answers,
  attempt_events, results, result_details, question_tags, question_media,
  study_materials, previous_papers, bookmarks, announcements, notifications,
  audit_logs, system_settings, datasets, dataset_versions, dataset_imports, dataset_import_errors

Universal Taxonomy Tables (New Additions in Phase 1):
  countries, states, exam_authorities, exams, exam_groups, exam_stages,
  papers, syllabuses, units, subtopics, books, book_chapters, licenses,
  pyq_papers, pyq_questions, official_answer_keys, ai_predictions,
  study_plans, study_plan_items
```

---

## 2. Universal Schema Entity Definitions

### 2.1 Geographic & Authority Entities
```sql
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    iso_code VARCHAR(3) UNIQUE NOT NULL, -- "IND"
    name VARCHAR(100) NOT NULL
);

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    country_id INT REFERENCES countries(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,           -- "TN", "KA", "DL"
    is_national BOOLEAN DEFAULT false    -- true for Central / All-India
);

CREATE TABLE exam_authorities (
    id SERIAL PRIMARY KEY,
    state_id INT REFERENCES states(id),
    code VARCHAR(50) UNIQUE NOT NULL,    -- "TNPSC", "UPSC", "IBPS", "SSC", "TRB"
    name VARCHAR(255) NOT NULL,
    website_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Examination Structure & Versioned Syllabuses
```sql
CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    authority_id INT REFERENCES exam_authorities(id),
    category_id INT REFERENCES exam_categories(id),
    code VARCHAR(50) NOT NULL,           -- "TNPSC_G2", "IBPS_PO", "SSC_CGL"
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    eligibility_summary TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_stages (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
    stage_order INT NOT NULL,            -- 1: Prelims, 2: Mains, 3: Interview
    name VARCHAR(100) NOT NULL,          -- "Preliminary Examination"
    pattern_summary TEXT
);

CREATE TABLE papers (
    id SERIAL PRIMARY KEY,
    stage_id INT REFERENCES exam_stages(id) ON DELETE CASCADE,
    paper_number INT NOT NULL,           -- 1
    title VARCHAR(255) NOT NULL,         -- "General Studies (Paper I)"
    duration_minutes INT NOT NULL,       -- 180
    total_marks NUMERIC(6,2) NOT NULL,   -- 200.00
    negative_marking_ratio NUMERIC(3,2)  -- 0.33 or 0.25
);

CREATE TABLE syllabuses (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id),
    stage_id INT REFERENCES exam_stages(id),
    version_label VARCHAR(50) NOT NULL,  -- "2024-Notification"
    is_active BOOLEAN DEFAULT true,
    source_notification_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    title VARCHAR(255) NOT NULL
);

CREATE TABLE subtopics (
    id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    learning_outcomes TEXT
);
```

### 2.3 Academic Library & Provenance Entities
```sql
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,    -- "CC_BY", "PUBLIC_DOMAIN", "COPYRIGHT_LINK_ONLY"
    name VARCHAR(100) NOT NULL,
    can_redistribute BOOLEAN NOT NULL,
    attribution_required BOOLEAN NOT NULL
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    license_id INT REFERENCES licenses(id),
    title VARCHAR(255) NOT NULL,
    authors TEXT,
    publisher VARCHAR(255),
    edition VARCHAR(50),
    language VARCHAR(20) DEFAULT 'English',
    source_url TEXT,
    download_url TEXT,
    is_quarantined BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE book_chapters (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject_id INT REFERENCES subjects(id),
    topic_id INT REFERENCES topics(id)
);
```

### 2.4 Three-Tier Marks & AI Prediction Tables
```sql
CREATE TABLE predicted_scores (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    exam_id INT REFERENCES exams(id),
    predicted_min NUMERIC(6,2) NOT NULL,
    predicted_max NUMERIC(6,2) NOT NULL,
    confidence_interval NUMERIC(3,2) NOT NULL, -- 0.85
    readiness_score INT NOT NULL,              -- 0-100
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE official_results (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    exam_id INT REFERENCES exams(id),
    roll_number VARCHAR(100),
    official_marks NUMERIC(6,2) NOT NULL,
    rank_achieved INT,
    proof_document_url TEXT,
    verified_by_admin_id INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

