# 16 — Indian DPDP Act Compliance, Institutional Workspaces & Offline Architecture

## 1. Overview
BANK-101 is built to strictly comply with the **Digital Personal Data Protection (DPDP) Act, 2023** enacted by the Parliament of India. As an educational examination platform handling candidate assessments, identity documents, and academic performance, BANK-101 ensures candidate data sovereignty, granular purpose-specific consent, verifiable audit logs, and clear enforcement of Data Principal statutory rights.

---

## 2. DPDP Act (2023) Core Provisions & Implementation

### Section 6: Notice & Purpose-Specific Consent
BANK-101 requires itemized, freely-given consent for distinct data processing purposes:
1. `EXAM_EVALUATION`: Evaluating submitted CBT responses, calculating marks, and maintaining score registries.
2. `AI_PERSONALIZATION`: Generating adaptive daily study schedules, identifying topic weaknesses, and projecting predicted scores.
3. `COMMUNICATION`: Notifying candidates regarding commission schedule changes, revised syllabuses, and answer key releases.

Consent events are permanently stored in `dpdp_consent_records` capturing IP address, user agent, and timestamp.

### Section 11: Right to Access & Data Portability
Candidates can at any time request a machine-readable JSON archive (`GET /api/v1/compliance/export`) containing:
- Account profile details
- Complete history of CBT attempts and percentage scores
- Grounded AI tutor consultation history
- Consent log history

### Section 12: Right to Correction & Erasure ("Right to be Forgotten")
Candidates can submit a formal erasure request (`POST /api/v1/compliance/forget-me`). When executed:
- Phone numbers and identifying usernames are immediately wiped and anonymized (`deleted_user_<id>`).
- The audit record is logged in `data_subject_requests` with resolution status `completed`.

---

## 3. Institutional Workspaces & Coaching Center Multi-Tenancy

BANK-101 provides dedicated workspaces for physical and online coaching academies (e.g. *Chennai IAS & TNPSC Academy*, *National Bankers Institute*):
- **Cohort Batches (`institution_batches`)**: Paced for specific examination years (e.g., *TNPSC Group 1 Weekend Super 50*).
- **Batch Enrollment (`batch_students`)**: Tracks individual student progress within the institution.
- **Curriculum & Mock Test Assignment (`batch_assigned_tests`)**: Faculty members can assign standardized mock examinations with deadlines and mandatory completion flags.

---

## 4. Offline CBT Engine & Sync Protocol
For candidates in regions with intermittent or low-bandwidth internet connectivity:
- Examination bundles and question banks are cached in local browser storage via service workers.
- Candidates complete the examination in full offline mode.
- When internet connection is re-established, the offline payload is securely ingested via `POST /api/v1/compliance/sync`.
- The engine guarantees **idempotent sync** via unique client attempt UUIDs (`client_attempt_uuid`), preventing duplicate scores or double submissions.

