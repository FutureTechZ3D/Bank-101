import { query, withTransaction } from '../../config/db';

export interface DatasetQuestionInput {
  question_text: string;
  question_type?: 'single_mcq' | 'multi_mcq' | 'true_false' | 'numerical' | 'assertion_reason' | 'passage';
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  year?: number;
  // For MCQs / Assertion-Reason:
  options?: { label: string; text: string; is_correct?: boolean }[];
  correct_option?: string; // e.g. "A" or "A,C"
  // For Numerical:
  numerical_answer?: number;
  numerical_tolerance?: number;
  // For Passage:
  passage_text?: string;
  // Explanation:
  explanation?: string;
  // Metadata / Mapping:
  topic_name?: string;
  subject_name?: string;
}

export interface IngestionValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; error: string; dataPreview?: any }[];
  previewQuestions: any[];
}

/**
 * Validates an array of question inputs against the BANK-101 schema rules.
 */
export function validateQuestionBatch(rawQuestions: any[]): IngestionValidationResult {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return {
      valid: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: 0, error: 'Dataset must be a non-empty array of questions' }],
      previewQuestions: [],
    };
  }

  const errors: { row: number; error: string; dataPreview?: any }[] = [];
  const previewQuestions: any[] = [];

  rawQuestions.forEach((q, idx) => {
    const rowNum = idx + 1;
    if (!q || typeof q !== 'object') {
      errors.push({ row: rowNum, error: 'Row is not a valid JSON object' });
      return;
    }

    if (!q.question_text || typeof q.question_text !== 'string' || !q.question_text.trim()) {
      errors.push({ row: rowNum, error: 'question_text is required and cannot be empty' });
      return;
    }

    const qType = q.question_type || 'single_mcq';
    const allowedTypes = ['single_mcq', 'multi_mcq', 'true_false', 'numerical', 'assertion_reason', 'passage'];
    if (!allowedTypes.includes(qType)) {
      errors.push({ row: rowNum, error: `Invalid question_type: '${qType}'. Allowed: ${allowedTypes.join(', ')}` });
      return;
    }

    if (qType === 'numerical') {
      const numVal = Number(q.numerical_answer);
      if (isNaN(numVal)) {
        errors.push({ row: rowNum, error: 'numerical question requires a valid numerical_answer' });
        return;
      }
    } else {
      // Must have options
      let opts = q.options;
      if (!Array.isArray(opts) || opts.length < 2) {
        errors.push({ row: rowNum, error: `Question type '${qType}' requires an 'options' array with at least 2 choices` });
        return;
      }

      // Check if correct option is designated either inside options or via correct_option
      let hasCorrect = opts.some((o: any) => o.is_correct === true || o.is_correct === 'true');
      if (!hasCorrect && typeof q.correct_option === 'string') {
        const correctSet = q.correct_option.split(',').map((s: string) => s.trim().toUpperCase());
        opts = opts.map((o: any) => ({
          ...o,
          label: String(o.label || '').toUpperCase(),
          is_correct: correctSet.includes(String(o.label || '').toUpperCase()),
        }));
        hasCorrect = opts.some((o: any) => o.is_correct === true);
      }

      if (!hasCorrect) {
        errors.push({ row: rowNum, error: 'No option is marked as correct (use is_correct=true or correct_option="A")' });
        return;
      }
    }

    previewQuestions.push({
      row: rowNum,
      question_text: q.question_text.trim(),
      question_type: qType,
      difficulty: q.difficulty || 'medium',
      topic_name: q.topic_name || 'General Practice',
      subject_name: q.subject_name || 'Simplification',
      options: q.options || [],
      numerical_answer: q.numerical_answer !== undefined ? Number(q.numerical_answer) : null,
      explanation: q.explanation || '',
    });
  });

  return {
    valid: errors.length === 0,
    totalRows: rawQuestions.length,
    validRows: previewQuestions.length,
    invalidRows: errors.length,
    errors,
    previewQuestions: previewQuestions.slice(0, 5), // first 5 for preview
  };
}

/**
 * Parses CSV text into question objects.
 * Format: question_text,question_type,opt_a,opt_b,opt_c,opt_d,opt_e,correct_option,explanation,topic_name
 */
export function parseCSVQuestions(csvContent: string): any[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex matches CSV fields taking quotes into account
    const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanValues = values.map((v) => v.trim().replace(/^["']|["']$/g, '').replace(/""/g, '"'));

    const rowObj: any = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cleanValues[idx] || '';
    });

    // Build standard question input
    const qType = rowObj.question_type || 'single_mcq';
    const q: any = {
      question_text: rowObj.question_text || rowObj.question || '',
      question_type: qType,
      difficulty: rowObj.difficulty || 'medium',
      explanation: rowObj.explanation || '',
      topic_name: rowObj.topic_name || rowObj.topic || 'Simplification Practice',
      subject_name: rowObj.subject_name || rowObj.subject || 'Simplification',
    };

    if (qType === 'numerical') {
      q.numerical_answer = Number(rowObj.correct_option || rowObj.numerical_answer || 0);
      q.numerical_tolerance = Number(rowObj.numerical_tolerance || 0.001);
    } else {
      const opts: any[] = [];
      ['a', 'b', 'c', 'd', 'e'].forEach((label) => {
        const val = rowObj[`opt_${label}`] || rowObj[`option_${label}`] || rowObj[label];
        if (val) {
          opts.push({
            label: label.toUpperCase(),
            text: val,
            is_correct: (rowObj.correct_option || '').trim().toUpperCase() === label.toUpperCase(),
          });
        }
      });
      q.options = opts;
    }

    rows.push(q);
  }
  return rows;
}

/**
 * Commits a validated batch of questions into PostgreSQL in a single atomic transaction.
 */
export async function commitQuestionBatch(
  validatedQuestions: any[],
  opts: {
    datasetName: string;
    userId?: number;
    createQuizTest?: boolean;
    quizTitle?: string;
  }
) {
  return await withTransaction(async (q) => {
    // 1. Record in datasets
    const dsRes = await q(
      `INSERT INTO datasets (name, description) VALUES ($1, $2) RETURNING id`,
      [opts.datasetName, `Batch import of ${validatedQuestions.length} questions`]
    );
    const datasetId = dsRes.rows[0].id;

    // Record dataset import record
    const importRes = await q(
      `INSERT INTO dataset_imports (dataset_id, imported_by, total_rows, imported_rows, status)
       VALUES ($1, $2, $3, $4, 'completed') RETURNING id`,
      [datasetId, opts.userId || null, validatedQuestions.length, validatedQuestions.length]
    );

    // Resolve or find default subject and topic
    const subjectRes = await q(`SELECT id FROM subjects WHERE name = 'Simplification' LIMIT 1`);
    const defaultSubjectId = subjectRes.rows[0]?.id || 1;

    let quizId: number | null = null;
    if (opts.createQuizTest) {
      // Find or create topic
      let topicRes = await q(`SELECT id FROM topics WHERE subject_id = $1 LIMIT 1`, [defaultSubjectId]);
      const topicId = topicRes.rows[0]?.id || 1;
      const qzRes = await q(
        `INSERT INTO quiz_tests (topic_id, name, duration_mins, total_qs)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [topicId, opts.quizTitle || `${opts.datasetName} Quiz`, 50, validatedQuestions.length]
      );
      quizId = qzRes.rows[0].id;
    }

    const insertedQuestionIds: number[] = [];

    // 2. Insert each question and options
    for (const item of validatedQuestions) {
      // Ensure topic exists
      const topName = item.topic_name || 'Simplification Practice';
      let topRes = await q(
        `SELECT id FROM topics WHERE name = $1 AND subject_id = $2`,
        [topName, defaultSubjectId]
      );
      let tId = topRes.rows[0]?.id;
      if (!tId) {
        const newTop = await q(
          `INSERT INTO topics (subject_id, name, difficulty) VALUES ($1, $2, $3) RETURNING id`,
          [defaultSubjectId, topName, item.difficulty || 'medium']
        );
        tId = newTop.rows[0].id;
      }

      // Insert question
      const qRes = await q(
        `INSERT INTO question_bank (topic_id, question_text, difficulty, language, question_type, numerical_answer, numerical_tolerance, passage_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          tId,
          item.question_text,
          item.difficulty || 'medium',
          item.language || 'English',
          item.question_type || 'single_mcq',
          item.numerical_answer || null,
          item.numerical_tolerance || 0.001,
          item.passage_text || null,
        ]
      );
      const questionId = qRes.rows[0].id;
      insertedQuestionIds.push(questionId);

      // Insert options if present
      if (Array.isArray(item.options)) {
        for (const opt of item.options) {
          await q(
            `INSERT INTO options (question_id, label, text, is_correct)
             VALUES ($1, $2, $3, $4)`,
            [questionId, opt.label, opt.text, opt.is_correct === true]
          );
        }
      }

      // Insert explanation if provided
      if (item.explanation) {
        const shortAns = item.options?.find((o: any) => o.is_correct)?.text || 'Solution';
        await q(
          `INSERT INTO explanations (question_id, short_answer, detailed_text) VALUES ($1, $2, $3)`,
          [questionId, shortAns, item.explanation]
        );
      }

      // If a quiz test is being constructed, map question
      if (quizId) {
        await q(
          `INSERT INTO quiz_question_map (quiz_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [quizId, questionId]
        );
      }
    }

    return {
      datasetId,
      importId: importRes.rows[0].id,
      importedCount: insertedQuestionIds.length,
      quizId,
    };
  });
}
