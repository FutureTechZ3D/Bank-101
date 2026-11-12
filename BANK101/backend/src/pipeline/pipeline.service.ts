import { query } from '../config/db';
import { runFullPipeline, ingestQuestions, ingestBooks, ingestPYQPapers, generateStandardMockTests } from './importer';
import { IngestionSummary } from './types';

export async function getPipelineStats() {
  const [qRes, testRes, bookRes, chRes, pyqPaperRes, pyqQRes, examsRes] = await Promise.all([
    query('SELECT count(*)::int as count FROM question_bank'),
    query('SELECT count(*)::int as count FROM quiz_tests'),
    query('SELECT count(*)::int as count FROM books'),
    query('SELECT count(*)::int as count FROM book_chapters'),
    query('SELECT count(*)::int as count FROM pyq_papers'),
    query('SELECT count(*)::int as count FROM pyq_questions'),
    query('SELECT count(*)::int as count FROM exams'),
  ]);

  const subjectsRes = await query(`
    SELECT s.name as subject_name, count(q.id)::int as question_count
    FROM subjects s
    LEFT JOIN topics t ON t.subject_id = s.id
    LEFT JOIN question_bank q ON q.topic_id = t.id
    GROUP BY s.id, s.name
    ORDER BY question_count DESC
    LIMIT 10
  `);

  return {
    total_questions: qRes.rows[0]?.count || 0,
    total_quizzes: testRes.rows[0]?.count || 0,
    total_books: bookRes.rows[0]?.count || 0,
    total_chapters: chRes.rows[0]?.count || 0,
    total_pyq_papers: pyqPaperRes.rows[0]?.count || 0,
    total_pyq_questions: pyqQRes.rows[0]?.count || 0,
    total_exams: examsRes.rows[0]?.count || 0,
    subject_breakdown: subjectsRes.rows,
  };
}

export async function triggerPipelineRun(scope?: string): Promise<IngestionSummary> {
  if (!scope || scope === 'all') {
    return runFullPipeline();
  }

  const start = Date.now();
  let qImp = 0, qSkip = 0, bImp = 0, chImp = 0, pImp = 0, pqImp = 0, mocks = 0;

  if (scope === 'questions') {
    const r = await ingestQuestions();
    qImp = r.imported;
    qSkip = r.skipped;
    mocks = await generateStandardMockTests();
  } else if (scope === 'books') {
    const r = await ingestBooks();
    bImp = r.imported;
    chImp = r.chapters;
  } else if (scope === 'pyqs') {
    const r = await ingestPYQPapers();
    pImp = r.imported;
    pqImp = r.questions;
  }

  return {
    timestamp: new Date().toISOString(),
    total_questions_imported: qImp,
    total_questions_skipped: qSkip,
    total_books_imported: bImp,
    total_chapters_imported: chImp,
    total_pyq_papers_imported: pImp,
    total_pyq_questions_imported: pqImp,
    total_mock_tests_created: mocks,
    categories: [scope],
    duration_ms: Date.now() - start,
  };
}
