# 10 — Reusable Examination Engine Specification
## CBT Architecture, State Recovery & Evaluation

---

## 1. Exam Engine Workflow & States

```
[Student starts attempt]
       │
       ▼
[GET /attempts/start] ──► Generates attempt_id with server started_at timestamp
       │
       ▼
[Live CBT Exam Room]
   ├── Palette States:
   │     • Unvisited (white)
   │     • Visited Unanswered (red/amber)
   │     • Answered (green)
   │     • Marked for Review (purple)
   │     • Answered & Marked for Review (purple with green indicator)
   │
   ├── Question Types Supported:
   │     • Single-correct MCQ (Options A–D, or A–E)
   │     • Multi-correct MCQ (Option sets)
   │     • Numerical input (with configured decimal tolerance)
   │     • Assertion & Reason (Two statements + 4 standard deduction options)
   │     • Passage / Comprehension (Parent text + dependent sub-questions)
   │
   ├── Reconnection & Recovery:
   │     • GET /attempts/:id/state fetches current saved answers, review flags, and remaining seconds
   │
   └── Server-Authoritative Timer:
         • Duration configured per quiz test
         • Answers rejected after deadline + 30s network buffer
```

---

## 2. API Endpoints

- `POST /api/v1/attempts/start` — Initializes attempt.
- `POST /api/v1/attempts/answer` — Saves answer (supports `selected_option`, `text_answer`, `marked_for_review`).
- `GET /api/v1/attempts/:id/state` — Full live state recovery for connection drops and page refreshes.
- `POST /api/v1/attempts/submit` — Atomically grades and finalizes the attempt.

