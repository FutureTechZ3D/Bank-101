# BANK-101 — Project Documentation

This folder contains all reference materials, design documents, and architectural analysis for the BANK-101 competitive exam preparation platform.

## Contents

| File / Folder | Description |
|---|---|
| `PROJECT_CONCEPT.txt` | Original project concept document (Tamil/English) — the initial vision for the platform |
| `ARCHITECTURE_NOTES.txt` | Early architecture notes from the design phase |
| `DESIGN_CHAT_HISTORY.txt` | Design conversation history with feature planning and Stitch AI prompts |
| `BANK-101_Project_Document.pdf` | Official project specification document |
| `BANK-101_Full_Exam_Structure.pdf` | Complete exam hierarchy and structure reference |
| `bank101_exam_hierarchy.html` | Interactive HTML version of the exam hierarchy |
| `ARCHITECTURE_ANALYSIS/` | Deep reverse-engineering analysis of the original prototype |
| `ARCHITECTURE_ANALYSIS/EXISTING_ARCHITECTURE_REPORT.md` | 23-section architecture analysis (auth, backend, frontend, DB, security, APIs, data flows) |
| `ARCHITECTURE_ANALYSIS/ER_DIAGRAM.md` | Entity relationship diagram (Mermaid) for the 16-table PostgreSQL schema |

## Active Codebase

The working, hardened codebase lives in `../BANK101/`.

See `../BANK101/NEXT.md` for the full log of what was fixed across 5 batches (security hardening, real PostgreSQL, test suite, PDF import pipeline).

## Target Architecture

The target full-stack architecture is defined in the user's architecture specification and covers:

- Authentication & Authorization (RBAC, roles, permissions)
- Admin Panel (10 modules: dashboard, user mgmt, exam mgmt, question bank, datasets, attempts, analytics, content, settings)
- User Panel (exam discovery, practice, mock exams, results, progress, certificates)
- Frontend (feature-based React/Vite/TS with centralized API client)
- Backend (modular Express/TS with service/repository layers)
- Database (PostgreSQL, 16+ tables, migrations, seed)
- Exam Engine (negative marking, all question types, server-side timer, attempt recovery)
- Dataset Pipeline (PDF extraction, validation, import with rollback)
- Testing & Deployment (75/75 backend + 50/50 e2e tests, Docker/CI planned)
