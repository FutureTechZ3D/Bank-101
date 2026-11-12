# 20 — Feature Completion Matrix
## BANK-101 Current Status vs. Master Architecture Roadmap

---

## 📊 Status Legend
- ✅ **COMPLETED**: Implemented, verified with automated tests, active in codebase.
- 🟡 **IN PROGRESS**: Partially implemented or currently being transitioned.
- ⭕ **PLANNED**: Architected in the roadmap, scheduled for upcoming phases.

---

## 1. Domain-by-Domain Status Matrix

| Module / Domain | Feature | Status | Notes / Test Coverage |
|---|---|---|---|
| **Identity & Security** | JWT Authentication with secure secrets | ✅ COMPLETED | Tested in `api.test.ts` |
| | Password hashing (bcrypt) | ✅ COMPLETED | Malformed seed bypass eliminated |
| | Role-Based Access Control (RBAC) | ✅ COMPLETED | 15 roles/permissions in `rbac.test.ts` |
| | Refresh Token Rotation & Session Revocation | ✅ COMPLETED | Handled in `/auth/refresh` & `/logout` |
| | Google Identity Services Auth | 🟡 IN PROGRESS | Configured on frontend, stubbed backend token check |
| | Enterprise Multi-Tenant / Institution Roles | ✅ COMPLETED | Multi-tenant coaching centers in `009` & `institutions_and_compliance.test.ts` |
| **Exam Catalog & Taxonomy** | Exam Categories (10 core families) | ✅ COMPLETED | Bank, TNPSC, SSC, RRB, UPSC, NEET, GATE, CAT, etc. |
| | Authority & State-level entity modeling | ✅ COMPLETED | UPSC, SSC, IBPS, RRB, NTA, TNPSC, TRB, TNUSRB, MRB, TANGEDCO |
| | Multi-stage exam hierarchy (Prelims/Mains/Interview)| ✅ COMPLETED | Verified in `catalog.test.ts` & `catalog_expansion.test.ts` |
| | Versioned Syllabuses (`syllabuses`, `units`, `subtopics`)| ✅ COMPLETED | Multi-stage syllabuses seeded in 008 migration |
| | Cross-Exam Comparison Engine | ✅ COMPLETED | State-to-National overlap verified in `catalog_expansion.test.ts` |
| **Question Bank & Ingestion** | Single-correct MCQ (4-option and 5-option A–E) | ✅ COMPLETED | Tested in `import.test.ts` |
| | Exact Fractional Math Calculator & Solver | ✅ COMPLETED | Python verifier in `database/import/verify.py` |
| | Atomic Upload with Rollback (`withTransaction`) | ✅ COMPLETED | Proven on real PostgreSQL in `pg-real.test.ts` |
| | Multi-Question Types (Numerical, Assertion, Matching) | ✅ COMPLETED | Verified in `exam_engine.test.ts` |
| | Multi-format Ingestion (CSV, XLSX, JSONL, PDF) | ✅ COMPLETED | Preview & Import in `dataset.service.ts` |
| **Examination Engine** | Timed CBT Exam Room | ✅ COMPLETED | Server-enforced test duration |
| | Dynamic Question Palette | ✅ COMPLETED | Verified in `QuizEnginePage.tsx` |
| | Hint System (Free 10 hints vs Pro unlimited explanations) | ✅ COMPLETED | Race-condition guarded with `SELECT FOR UPDATE` |
| | Negative Marking Engine | ✅ COMPLETED | Configurable marks per question & negative ratios |
| | Autosave & Real-time Attempt Recovery | ✅ COMPLETED | `GET /attempts/:id/state` & review flags active |
| **Digital Academic Library** | Open Educational Resources (OER) Catalog | ✅ COMPLETED | NCERT, SCERT, OpenStax, Public Domain |
| | Copyright & License Verification Registry | ✅ COMPLETED | `licenses` table & URL suppression active |
| | Chapter & Syllabus Topic Mapping | ✅ COMPLETED | `book_chapters` mapped to syllabus topics |
| **Previous-Year Papers** | PYQ Metadata & Document Storage | ✅ COMPLETED | `pyq_papers` for TNPSC, SSC, and IBPS |
| | Official Answer Key vs AI Explanation Separation | ✅ COMPLETED | Tri-partite model verified in `library.test.ts` |
| **AI Learning Engine** | Syllabus-Anchored RAG Mentor | ✅ COMPLETED | Verified citations in `ai_learning.test.ts` & bilingual EN/TA |
| | Dynamic Daily & Weekly Study Planner | ✅ COMPLETED | Distributed topic scheduling & completion toggle |
| | Cognitive Weakness Detector | ✅ COMPLETED | Topic weakness severity & diagnostic query |
| | 3-Tier Marks System (*Official*, *Platform*, *Predicted*) | ✅ COMPLETED | Strict separation verified in `ai_learning.test.ts` |
| **Admin & Governance** | Admin Dashboard & Statistics | ✅ COMPLETED | `/admin/stats` and `/admin/analytics` verified |
| | User Management & Tier Toggles | ✅ COMPLETED | Tested in `admin.test.ts` |
| | Audit Logging | ✅ COMPLETED | Table `audit_logs` seeded and verified |
| | Announcements & Content Management | ✅ COMPLETED | Full CRUD verified |
| **Institutions & Multi-Tenancy** | Coaching Center Workspaces | ✅ COMPLETED | Academies, cohorts & student enrollment verified |
| | Cohort Mock Assignment | ✅ COMPLETED | Faculty test scheduling & mandatory deadlines |
| **Data Protection & Offline** | Indian DPDP Act Compliance (2023) | ✅ COMPLETED | Consent audit trail, Data Portability, Right to Erasure |
| | Offline CBT Sync Engine | ✅ COMPLETED | Idempotent attempt ingestion & synchronization |

