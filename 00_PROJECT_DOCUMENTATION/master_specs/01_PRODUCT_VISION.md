# 01 — Product Vision: BANK-101
## Unified National Examination, Assessment & AI Learning Ecosystem

---

## 1. Product Identity & Tagline
**BANK-101 — Beyond Examination. Intelligent Learning.**

BANK-101 is engineered not as an ordinary online testing website, but as a **Unified National Examination, Learning, Assessment, and AI Preparation Ecosystem** for India and Tamil Nadu.

The platform spans from school-level competitive exams (Olympiads, NTSE, NMMS) to national entrance examinations (GATE, NEET, JEE, CAT, CUET, CLAT), government recruitments (UPSC, SSC, RRB, Banking, Insurance, Defense), teaching eligibility (CTET, UGC NET, CSIR NET), and state-level public service recruitments (with priority deep-coverage for Tamil Nadu authorities: TNPSC, TRB, TNUSRB, MRB, TANGEDCO).

---

## 2. Core Architectural Philosophy: Exam-Independent & Syllabus-Driven

```
Traditional Exam Prep Site (Flawed):
  [TNPSC Portal]   [UPSC Portal]   [Bank Exam Portal]   [SSC Portal]
       (Hardcoded separate silos, duplicated code, fragmented content)

BANK-101 Unified Architecture (Target):
  +-------------------------------------------------------------------+
  |               Configurable Universal Examination Engine           |
  |  - Reusable CBT Exam Room        - Configurable Marking Schemes   |
  |  - Multi-Question Type Handlers  - Real-Time Server Timers & Save |
  +-------------------------------------------------------------------+
                                   ▲
  +--------------------------------┴----------------------------------+
  |              Hierarchical Taxonomy & Syllabus Graph                |
  | Country → State → Authority → Category → Exam → Stage → Paper     |
  |         → Subject → Unit → Topic → Subtopic (Versioned)           |
  +-------------------------------------------------------------------+
                                   ▲
  +--------------------------------┴----------------------------------+
  |           Verified Knowledge, PYQ & Digital Library Base           |
  |  - Public Domain & Open Texts   - Provenance-Tracked PYQs         |
  |  - Verified Answer Keys         - Exact-Math Verification Engine  |
  +-------------------------------------------------------------------+
                                   ▲
  +--------------------------------┴----------------------------------+
  |                   Grounded AI Learning Engine                     |
  |  - Syllabus-Anchored RAG Mentor - Personalized Study Planning     |
  |  - Weakness & Gap Analytics     - Calibrated Score Estimation     |
  +-------------------------------------------------------------------+
```

### Key Principles:
1. **Never hardcode an exam in application code**: Every exam is an instance of configured schema metadata.
2. **Syllabus is the single source of truth**: Questions, digital library resources, revision flashcards, and AI prompts all link back to versioned syllabus topic IDs.
3. **Data Provenance & Verification**: AI must never fabricate answers. Official answer keys, mathematically verified solutions, and AI explanations are strictly kept distinct.
4. **Three-Tier Result Separation**:
   - *Official Results*: Legitimate published government marks.
   - *Platform Results*: Evaluated test score on BANK-101.
   - *AI Predicted Range*: Statistical estimation with explicit uncertainty indicators.

---

## 3. The Five Core Pillars

### Pillar 1: Universal Examination Directory
Complete repository of Indian national and state examinations detailing authority, eligibility rules, historical notification dates, exam patterns, stages, and official syllabuses. Includes the **Cross-Exam Comparison Engine** (e.g. comparing syllabus overlap between TNPSC Group II, SSC CGL, and IBPS PO).

### Pillar 2: Digital Academic Library
A legal, rights-respecting academic repository categorizing NCERT, state board materials, university textbooks, public domain books (OpenStax, Project Gutenberg), and reference works with strict license enforcement (CC-BY, Public Domain, or Direct Link/Quarantine for copyrighted works).

### Pillar 3: Previous-Year Question (PYQ) Repository
Historical past papers organized by `Exam → Year → Stage → Paper → Shift → Language`. Stores official papers alongside official keys, human-audited solutions, and provenance documentation.

### Pillar 4: Configurable Examination Engine
One unified CBT engine executing topic tests, chapter tests, sectional tests, full-length mocks, and previous-year papers with support for single MCQ, multi-correct MCQ, numerical entries, assertion-reason, diagram/comprehension, negative marking, and real-time recovery.

### Pillar 5: Grounded AI Learning Engine
Syllabus-anchored mentor providing bilingual tutoring (Tamil & English), generating test questions adhering to exact distribution constraints, identifying cognitive weaknesses, and formulating dynamic study schedules.

