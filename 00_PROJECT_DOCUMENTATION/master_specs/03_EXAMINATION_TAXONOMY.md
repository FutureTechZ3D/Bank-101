# 03 — Complete Indian Examination Taxonomy & Classification System
## BANK-101 Universal Data Model for National & Tamil Nadu Examinations

---

## 1. Universal Hierarchy
Every examination record in BANK-101 resolves down a strict 12-level normalized path:

```
[Country] (e.g. India)
  └── [State / Territory] (e.g. Central / National, Tamil Nadu, Karnataka)
        └── [Exam Authority] (e.g. UPSC, TNPSC, NTA, IBPS, SSC, TRB)
              └── [Exam Category] (e.g. Civil Services, Banking, Engineering, State Recruitment)
                    └── [Exam Definition] (e.g. TNPSC Group II, IBPS PO, UPSC CSE, GATE)
                          └── [Exam Group / Post] (e.g. Group II Services vs IIA Non-Interview Posts)
                                └── [Exam Stage] (e.g. Preliminary, Mains, Interview / Personality)
                                      └── [Paper] (e.g. Paper I: General Studies, Paper II: Aptitude)
                                            └── [Subject] (e.g. Quantitative Aptitude, Indian Polity)
                                                  └── [Unit] (e.g. Unit V: Indian Constitution)
                                                        └── [Topic] (e.g. Fundamental Rights)
                                                              └── [Subtopic] (e.g. Article 21 & Due Process)
```

---

## 2. Priority Examination Authorities & Families

### 2.1 National Authorities (Central)
| Authority | Covered Examination Families | Example Posts / Cadres |
|---|---|---|
| **UPSC** | Civil Services Examination (CSE), Indian Forest Service (IFoS), ESE (Engineering), CDS, NDA, CAPF, CMS | IAS, IPS, IFS, IRS, Executive Engineers, Military Cadets |
| **IBPS** | PO (Probationary Officers), Clerk, SO (Specialist Officers), RRB Scale I/II/III & Office Assistants | Nationalized Banks & Regional Rural Banks across India |
| **SBI / RBI / Regulators** | SBI PO, SBI Clerk, RBI Grade B, RBI Assistant, NABARD Grade A/B, SEBI Grade A, LIC AAO/ADO | Apex & Specialist Banking & Financial Regulators |
| **SSC** | CGL (Combined Graduate Level), CHSL (10+2), MTS (Multi-Tasking), CPO (Sub-Inspector in Police/CAPF), JE, Stenographer | Central Government Ministries, Inspectoral Staff, Technical Cadres |
| **RRB** | NTPC Graduate & Undergraduate, Group D, ALP (Assistant Loco Pilot), Technician, RRB JE, RPF SI/Constable | Indian Railways Technical, Operations, and Protective Staff |
| **NTA** | NEET-UG, JEE Main, CUET-UG/PG, UGC-NET, CMAT, GPAT | National Higher Education Entrance & Fellowship Qualifications |
| **IITs / IISc** | GATE (all science & engineering papers), JEE Advanced, JAM, CEED | Postgraduate Engineering, Science, and Design Master Admissions |
| **IIMs / Management** | CAT, XAT, MAT, NMAT, SNAP, GMAT | Premier Indian Management Entrances |
| **CBSE** | CTET (Central Teacher Eligibility Test) Paper I & II | National School System Primary & Secondary Teacher Certification |
| **Uniformed Forces** | Agniveer (Army, Navy, Air Force), AFCAT, Indian Coast Guard | Armed Services Enlisted & Commissioned Entry |

---

### 2.2 Tamil Nadu State Authorities (Priority Deep Coverage)
| Authority | Official Name | Scope & Examinations |
|---|---|---|
| **TNPSC** | Tamil Nadu Public Service Commission | Group I (Deputy Collector, DSP), Group II / IIA (Sub-Registrar, Municipal Commissioner, Revenue Assistant), Group IV / VAO, Combined Technical Services (CTS), Group IA/IB/IC |
| **TRB** | Teachers Recruitment Board (TN) | TNTET Paper I & II, Post Graduate Assistant (PG Assistant), Graduate Teacher (BT Assistant), Polytechnic College Lecturer, Assistant Professor (Colleges & Universities) |
| **TNUSRB** | Tamil Nadu Uniformed Services Recruitment Board | Sub-Inspector of Police (Taluk, AR, TSP), Grade II Police Constable, Jail Warder, Fireman |
| **MRB** | Medical Services Recruitment Board (TN) | Assistant Surgeon / Medical Officer, Staff Nurse, Pharmacist, Lab Technician, Health Visitors |
| **TANGEDCO / TNPDCL** | TN Generation & Distribution Corporation | Assistant Engineer (Electrical, Mechanical, Civil), Junior Assistant (Accounts), Field Assistant |
| **DGE TN** | Directorate of Government Examinations (TN) | SSLC (Class 10), HSC (Class 12), NMMS, National Talent Search (State quota), Trust Examination |
| **DTE TN** | Directorate of Technical Education (TN) | Government Polytechnic Diploma Examinations, Technical Skill Certifications |
| **TN Universities** | State Universities (Madras, Anna, Madurai Kamaraj, Bharathiar, etc.) | Common Entrance Tests, M.Phil / Ph.D. Research Entrance Assessments |

---

## 3. Syllabus Grounding & Versioning Architecture

Exams periodically update their syllabuses. For example, TNPSC revised its Group II syllabus to introduce the mandatory Tamil Eligibility Test paper. Therefore, **syllabuses must be versioned**:

```sql
-- Schema concept:
CREATE TABLE syllabuses (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id),
    stage_id INT REFERENCES exam_stages(id),
    version_label VARCHAR(50) NOT NULL, -- e.g. "2024 Revised Notification"
    effective_from DATE NOT NULL,
    effective_until DATE,               -- NULL if current active
    is_active BOOLEAN DEFAULT true,
    official_notification_url TEXT
);
```

### Knowledge Graph Relationships:
- **Questions** are tagged with `topic_id`.
- **Previous-Year Questions** map to `(exam_id, year, stage_id, paper_id, topic_id)`.
- **Digital Library Chapters** map to `(subject_id, topic_id)`.
- **AI Tutor Context** queries `topic_id` to pull related notes, books, and validated questions.



---

## 4. Live Implementation Evidence (Phase 1 Delivered)

### 4.1 Active Migration:
- Applied in [`004_universal_taxonomy.sql`](file:///d:/(!SanjayASK%20Projects/BANK-101/BANK101/database/migrations/004_universal_taxonomy.sql).
- Normalized entities: `countries`, `states`, `exam_authorities`, `exams`, `exam_stages`, `papers`, `syllabuses`, `units`, `subtopics`, `exam_subject_map`.

### 4.2 API Endpoints:
- `GET /api/v1/catalog/authorities` — List national & state authorities (with `?state=TN` or `?national=true` filters).
- `GET /api/v1/catalog/authorities/:code` — Profile of authority and its active examinations.
- `GET /api/v1/catalog/exams` — List all unified examinations.
- `GET /api/v1/catalog/exams/:slug` — Full hierarchy: stages, papers, eligibility rules, and active syllabus version.
- `GET /api/v1/catalog/exams/:slug/syllabus` — Hierarchical tree: Subjects → Units → Topics → Subtopics.
- `GET /api/v1/catalog/compare?exams=slug1,slug2` — Cross-exam comparison engine analyzing common subjects and syllabus synergy.

### 4.3 Automated Verification:
- Automated tests in [`catalog.test.ts`](file:///d:/(!SanjayASK%20Projects/BANK-101/BANK101/backend/tests/catalog.test.ts) running on real PostgreSQL 18.6 (8/8 tests passing).
- Frontend UI in [`ExamDirectoryPage.tsx`](file:///d:/(!SanjayASK%20Projects/BANK-101/BANK101/frontend/src/pages/directory/ExamDirectoryPage.tsx) and [`ExamComparisonPage.tsx`](file:///d:/(!SanjayASK%20Projects/BANK-101/BANK101/frontend/src/pages/directory/ExamComparisonPage.tsx).
