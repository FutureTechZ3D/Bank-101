# 02 — Requirements Specification
## Functional & Non-Functional Requirements for BANK-101

---

## 1. Functional Requirements

### 1.1 Universal Examination Directory
- **FR-EX-01**: The system shall support browsing examinations filtered by Country, State, Authority, Category, and Cadre.
- **FR-EX-02**: Each examination page shall present: Overview, Eligibility Rules (Age/Education/Category), Stages, Papers, Marking Pattern, Syllabus Tree, and Official Notification history.
- **FR-EX-03**: The system shall provide an **Exam Comparison Engine** allowing users to select 2 to 3 exams and view side-by-side comparisons of common subjects, overlapping topics, exam patterns, and preparation efficiency scores.

### 1.2 Examination Engine (CBT)
- **FR-EE-01**: The exam engine shall enforce server-authoritative countdown timers. Responses submitted after the expiration threshold (+ 30 seconds network buffer) shall be rejected.
- **FR-EE-02**: Questions shall support 4-option (A–D), 5-option (A–E), numerical, multi-select, and comprehension passage formats with LaTeX math rendering.
- **FR-EE-03**: Question attempts must be idempotent. Re-submitting an existing open answer shall update the selected option via atomic upsert (`INSERT ... ON CONFLICT DO UPDATE`).
- **FR-EE-04**: Submission of an exam attempt must be atomic and final. Duplicate submit requests must return HTTP 409 and grant points only once.

### 1.3 Digital Academic Library
- **FR-DL-01**: Every book and learning resource shall store license type (`Public Domain`, `CC-BY`, `CC-BY-SA`, `Copyrighted-Link-Only`).
- **FR-DL-02**: Materials with restrictive or uncertain copyrights shall be automatically quarantined from public downloads and only displayed via official external links.
- **FR-DL-03**: Books shall be mapped down to chapters, subjects, and versioned syllabus topic IDs.

### 1.4 AI Learning & Tutoring
- **FR-AI-01**: The AI Tutor shall only generate answers grounded in verified syllabus topics, approved textbooks, or validated PYQs.
- **FR-AI-02**: Tutoring explanations must support bilingual delivery in Tamil and English, with mathematical and scientific notation preserved.
- **FR-AI-03**: The AI Study Planner shall compute daily and weekly preparation agendas based on days remaining until the target examination date and individual weakness scores.

---

## 2. Non-Functional Requirements

### 2.1 Security & Data Integrity
- **NFR-SEC-01**: Passwords must be hashed using industry-standard salted hashing algorithms.
- **NFR-SEC-02**: JWT secrets must be at least 32 characters in length and loaded strictly from secure environment variables.
- **NFR-SEC-03**: All administrative routes must be guarded by token authentication and database-verified role authorization.
- **NFR-SEC-04**: All database mutations affecting points, hints, or submissions must run in ACID transactions.

### 2.2 Performance & Scalability
- **NFR-PERF-01**: API latency for question retrieval and answer auto-save must remain under 150ms under typical load.
- **NFR-PERF-02**: Question datasets containing over 500 questions must be processed in background workers with transactional rollbacks on validation failures.

