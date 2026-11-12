# 04 — System Architecture
## Modular Full-Stack Architecture for BANK-101

---

## 1. Architectural Overview: Modular Monolith
BANK-101 is structured as a **Modular Monolith** with strict domain boundaries. This balances operational simplicity with future microservice extractability.

```
+-------------------------------------------------------------------------+
|                              FRONTEND                                   |
|   React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons            |
|   - Reusable CBT Exam Palette        - Admin Ingestion & Analytics      |
|   - Syllabus Explorer & Library      - AI Tutor & Planner Interface     |
+-------------------------------------------------------------------------+
                                    │ HTTPS / REST API
                                    ▼
+-------------------------------------------------------------------------+
|                            BACKEND API                                  |
|   Node.js / Express / TypeScript (Targeting Modular Domain Layout)      |
|   ├── Identity & RBAC                ├── Examination Engine             |
|   ├── Universal Catalog & Taxonomy   ├── Dataset Ingestion Pipeline     |
|   ├── Digital Library & PYQs         ├── Evaluation & Analytics         |
|   └── AI Orchestrator & Services     └── Audit Logging                  |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                            DATABASE LAYER                               |
|   PostgreSQL 18.6+ (Relational Single Source of Truth)                  |
|   - Strict Foreign Key Integrity     - Concurrency Locks & Indexes      |
|   - Transactional Rollbacks          - UTF-8 Encoding for Math & Tamil  |
+-------------------------------------------------------------------------+
```

---

## 2. Domain Module Boundaries

Each domain within the backend is isolated into its own module folder:
1. `modules/identity`: User registration, authentication, RBAC authorization, and token revocation.
2. `modules/catalog`: Managing authorities, exams, stages, papers, syllabuses, subjects, and topics.
3. `modules/exam_engine`: Attempt lifecycle, answer recording, server countdown timers, and objective scoring.
4. `modules/library`: Digital book indexing, copyright/license verification, and chapter mappings.
5. `modules/pyq`: Previous-year papers, question extractions, and official answer keys.
6. `modules/datasets`: Ingestion of CSV, JSON, and PDF files, schema validation, and transactional commits.
7. `modules/ai`: Retrieval-augmented generation (RAG), syllabus-grounded tutoring, and score estimation.
8. `modules/analytics`: Leaderboards, student performance trends, and platform usage metrics.

