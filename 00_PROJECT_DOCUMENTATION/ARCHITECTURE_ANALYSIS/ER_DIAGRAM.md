# BANK-101 — Entity Relationship Diagram

This is a standalone extract of the ERD from `EXISTING_ARCHITECTURE_REPORT.md` (§11).
It reflects the **real PostgreSQL schema** (`database/schema.sql`, 16 tables) — the schema the controllers actually use via `pg`. The Prisma/SQLite model (`prisma/schema.prisma`) is omitted because it is orphaned dead code (used only by `seed.ts`, with a different, smaller model that no controller reads). See the main report §10 for the schema contradiction.

```mermaid
erDiagram
    users ||--o{ quiz_attempts : "starts"
    users ||--o{ hint_usage : "requests"
    users ||--o{ certificates : "earns"
    users ||--o{ leaderboards : "ranked"

    exam_categories ||--o{ exam_types : "has"
    exam_types ||--o{ subjects : "contains"
    subjects ||--o{ topics : "groups"
    topics ||--o{ quiz_tests : "offers"
    topics ||--o{ question_bank : "covers"

    question_bank ||--o{ options : "has"
    question_bank ||--o| explanations : "explained by"
    question_bank ||--o{ attempt_answers : "answered in"
    question_bank ||--o{ hint_usage : "hinted for"

    quiz_tests ||--o{ quiz_question_map : "maps"
    question_bank ||--o{ quiz_question_map : "mapped to"
    quiz_tests ||--o{ quiz_attempts : "taken as"
    quiz_tests ||--o{ certificates : "certifies"
    quiz_tests ||--o{ leaderboards : "ranked by"

    quiz_attempts ||--o{ attempt_answers : "records"
    quiz_attempts ||--o{ hint_usage : "logs"
    quiz_attempts ||--|| results : "produces"

    users {
        int id PK
        string username UK
        string password_hash
        string phone
        string account_type
        string google_id
        int points
        int streak_days
        timestamp created_at
    }
    exam_categories {
        int id PK
        string name UK
        string icon
        string slug UK
    }
    exam_types {
        int id PK
        int category_id FK
        string name
    }
    subjects {
        int id PK
        int exam_type_id FK
        string name
        int sort_order
    }
    topics {
        int id PK
        int subject_id FK
        string name
        string difficulty
    }
    question_bank {
        int id PK
        int topic_id FK
        text question_text
        string difficulty
        int year
        string language
        boolean is_ai_generated
    }
    options {
        int id PK
        int question_id FK
        char label
        text text
        boolean is_correct
    }
    explanations {
        int id PK
        int question_id FK,UK
        text short_answer
        text detailed_text
        boolean is_ai_generated
    }
    quiz_tests {
        int id PK
        int topic_id FK
        string name
        int total_qs
        int duration_mins
        int year
    }
    quiz_question_map {
        int quiz_id PK,FK
        int question_id PK,FK
        int sort_order
    }
    quiz_attempts {
        int id PK
        int user_id FK
        int quiz_id FK
        timestamp started_at
        timestamp submitted_at
        int score
    }
    attempt_answers {
        int id PK
        int attempt_id FK
        int question_id FK
        char selected_option
        boolean is_correct
        int time_taken_seconds
    }
    hint_usage {
        int id PK
        int user_id FK
        int quiz_attempt_id FK
        int question_id FK
        timestamp used_at
    }
    results {
        int id PK
        int attempt_id FK,UK
        int total
        int correct
        int wrong
        int unanswered
        decimal percentage
    }
    certificates {
        int id PK
        int user_id FK
        int quiz_id FK
        string cert_number UK
        timestamp issued_at
    }
    leaderboards {
        int id PK
        int quiz_id FK
        int user_id FK
        int score
        int rank
        string period
    }
```

## Notes
- **Indexes:** only PKs and explicit `UNIQUE` constraints exist (`users.username`, `exam_categories.name`/`.slug`, `explanations.question_id`, `results.attempt_id`, `certificates.cert_number`). No indexes on any FK column or hot query path.
- **No status/enum columns** on `quiz_attempts` (no `status`, no concurrency guard). `account_type` is free-text with no `CHECK` (so `'Admin'` or arbitrary values can be inserted).
- **Missing entities vs target** (see main report §10): roles, permissions, user_roles, role_permissions, user_sessions, password_resets, email_verifications, audit_logs, exam_sections, exam_subjects, question_tags, question_media, datasets, dataset_versions, dataset_imports, dataset_import_errors, attempt_events, result_details, performance_analytics, subject_performance, study_materials, previous_papers, bookmarks, announcements, notifications, system_settings, application_logs.
- **Two contradictory schemas:** this diagram is the `pg`/PostgreSQL one. The Prisma/SQLite model (`User{id,username,accountType}`, flat `Question{optionA..E}`, `Result`) is disconnected and not depicted.
