export interface IngestOption {
  label: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  text: string;
  text_ta?: string;
  is_correct: boolean;
}

export interface IngestQuestion {
  exam_slug: string;
  stage_code?: string;
  paper_code?: string;
  subject_name: string;
  topic_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  question_text_ta?: string;
  options: IngestOption[];
  explanation?: string;
  explanation_ta?: string;
  source_reference?: string;
  year?: number;
  tags?: string[];
}

export interface IngestChapter {
  chapter_number: number;
  title: string;
  start_page?: number;
  end_page?: number;
  summary?: string;
  pdf_url?: string;
}

export interface IngestBook {
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  rights_status: 'PUBLIC_DOMAIN' | 'CREATIVE_COMMONS' | 'COPYRIGHT_LINK_ONLY';
  source_url: string;
  storage_path?: string;
  cover_image_url?: string;
  subject_name: string;
  exam_slugs: string[];
  chapters: IngestChapter[];
}

export interface IngestPYQPaper {
  exam_slug: string;
  stage_code: string;
  paper_code: string;
  year: number;
  session_name: string;
  official_pdf_url?: string;
  final_key_released_at?: string;
  questions: {
    question_number: number;
    question_text: string;
    question_text_ta?: string;
    options: { label: string; text: string; text_ta?: string }[];
    official_answer_key: string;
    is_dropped?: boolean;
    subject_name?: string;
    topic_name?: string;
  }[];
}

export interface IngestMockTestConfig {
  title: string;
  exam_slug: string;
  stage_code?: string;
  paper_code?: string;
  duration_mins: number;
  pass_percent: number;
  marks_per_question: number;
  negative_marks: number;
  question_filter?: {
    subject_name?: string;
    topic_name?: string;
    limit?: number;
  };
}

export interface IngestionSummary {
  timestamp: string;
  total_questions_imported: number;
  total_questions_skipped: number;
  total_books_imported: number;
  total_chapters_imported: number;
  total_pyq_papers_imported: number;
  total_pyq_questions_imported: number;
  total_mock_tests_created: number;
  categories: string[];
  duration_ms: number;
}

