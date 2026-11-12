# 13 — Data Ingestion & Dataset Pipeline Specification
## Multi-Format Bulk Upload, Schema Validation & Atomic Commits

---

## 1. Supported Ingestion Formats
1. **JSON Array**: Full question objects with structured options and explanations.
2. **CSV / Spreadsheets**: Flat rows mapping question text, question type, options A–E, correct option, explanation, and topic name.
3. **PDF Datasets**: PyPDF extraction with exact arithmetic verification (`verify.py`).

---

## 2. Ingestion Flow & Guardrails

```
[Raw CSV / JSON Content]
          │
          ▼
[1. POST /admin/datasets/preview]
   ├── Detects total rows
   ├── Validates required fields (question_text, question_type)
   ├── Checks option structures or numerical answers
   └── Reports line-by-line syntax & logic errors WITHOUT database mutation
          │
          ▼ (Admin reviews preview & confirms)
[2. POST /admin/datasets/import]
   ├── Begins database transaction (BEGIN)
   ├── Inserts into `datasets` & `dataset_imports`
   ├── Creates `topics` and `quiz_tests` if requested
   ├── Inserts questions, options, and explanations
   ├── Maps questions to quiz
   └── On ANY failure: ROLLBACK occurs leaving zero partial rows
```

