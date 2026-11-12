# 12 — Digital Academic Library & Previous-Year Papers Specification
## Universal Academic Knowledge, License Enforcement & Past Papers

---

## 1. Core Principles & Provenance Tracking

### 1.1 Academic Copyright Enforcement
1. **Public Domain / CC-BY**: Direct reading and downloads permitted (`can_redistribute = true`).
2. **NCERT & Tamil Nadu SCERT Textbooks**: Explicitly restricted from unauthorized third-party redistribution. BANK-101 indexes chapters, subjects, and topics while routing users to official portals (`can_redistribute = false`, `download_url = null`).
3. **Quarantine Gate**: Any unverified source is quarantined from public listing until rights verification is complete.

---

## 2. Previous-Year Papers (PYQ) Tri-Partite Model

To prevent hallucination and maintain absolute assessment integrity, every past examination question strictly segregates three tiers of truth:

```
+──────────────────────────────────────────────────────────+
| 1. Official Answer Key                                   |
|    - Final published government key                      |
|    - E.g., Option A (3815)                               |
+──────────────────────────────────────────────────────────+
                            ▲
                            │ Verified Against
                            ▼
+──────────────────────────────────────────────────────────+
| 2. Independently Recalculated Key                        |
|    - Computed by Python exact-fraction arithmetic engine  |
|    - Key discrepancy flags logged for manual audit       |
+──────────────────────────────────────────────────────────+
                            ▲
                            │ Explained By
                            ▼
+──────────────────────────────────────────────────────────+
| 3. AI / Expert Step-by-Step Explanation                  |
|    - Stored distinctly from official answer keys         |
|    - Grounded in textbook chapter references             |
+──────────────────────────────────────────────────────────+
```

---

## 3. Endpoints Implemented

- `GET /api/v1/library/books` — Catalog of academic textbooks with license terms.
- `GET /api/v1/library/books/:id` — Chapter hierarchy, topic mapping, and target examinations.
- `GET /api/v1/library/pyq` — Filterable past-year papers by exam and year.
- `GET /api/v1/library/pyq/:id` — Full paper breakdown with provenance notes and verified answer keys.

