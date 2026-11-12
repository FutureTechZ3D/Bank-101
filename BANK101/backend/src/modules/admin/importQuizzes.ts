import { withTransaction } from '../../config/db';

/** Options A-D are required; E is optional (many exam papers have five options, e.g. "None of these"). */
export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
const REQUIRED = ['A', 'B', 'C', 'D'] as const;
export const MAX_QUIZZES = 200;
export const MAX_QUESTIONS_PER_QUIZ = 200;

export interface ImportQuestion {
  question: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string;
}
export interface ImportQuiz {
  quiz_name: string;
  questions: ImportQuestion[];
}
export interface ImportResult {
  quizzes: number;
  questions: number;
  skipped: string[]; // quiz names that already existed (only when skipExisting)
}

/** Returns an error message (naming the quiz and question), or null when the payload is valid. */
export function validatePayload(topic: unknown, quizzesData: unknown): string | null {
  if (typeof topic !== 'string' || topic.trim().length < 1 || topic.length > 100) return 'topic must be a non-empty string (max 100 characters)';
  if (!Array.isArray(quizzesData) || quizzesData.length < 1 || quizzesData.length > MAX_QUIZZES) {
    return `quizzesData must be an array of 1-${MAX_QUIZZES} quizzes`;
  }
  for (const [qi, q] of (quizzesData as any[]).entries()) {
    if (!q || typeof q.quiz_name !== 'string' || !q.quiz_name.trim() || q.quiz_name.length > 100) return `quiz ${qi + 1}: quiz_name is required (max 100 characters)`;
    if (!Array.isArray(q.questions) || q.questions.length < 1 || q.questions.length > MAX_QUESTIONS_PER_QUIZ) {
      return `quiz ${qi + 1}: questions must be an array of 1-${MAX_QUESTIONS_PER_QUIZ}`;
    }
    for (const [ni, qn] of q.questions.entries()) {
      const where = `quiz ${qi + 1}, question ${ni + 1}`;
      if (!qn || typeof qn.question !== 'string' || !qn.question.trim()) return `${where}: question text is required`;
      if (!qn.options || typeof qn.options !== 'object') return `${where}: options A-D are required`;
      for (const l of REQUIRED) {
        if (typeof qn.options[l] !== 'string' || !qn.options[l].trim()) return `${where}: option ${l} is required`;
      }
      if (qn.options.E !== undefined && (typeof qn.options.E !== 'string' || !qn.options.E.trim())) return `${where}: option E must be non-empty text when given`;
      for (const k of Object.keys(qn.options)) {
        if (!(OPTION_LABELS as readonly string[]).includes(k)) return `${where}: unknown option label ${k} (allowed A-E)`;
      }
      const texts = OPTION_LABELS.filter((l) => qn.options[l] !== undefined).map((l) => String(qn.options[l]).trim());
      if (new Set(texts).size !== texts.length) return `${where}: two options have the same text`;
      if (typeof qn.correct_option !== 'string' || qn.options[qn.correct_option] === undefined) return `${where}: correct_option must be one of the given options (${texts.length === 5 ? 'A-E' : 'A-D'})`;
      if (qn.explanation !== undefined && typeof qn.explanation !== 'string') return `${where}: explanation must be text`;
    }
  }
  return null;
}

/**
 * Writes the quizzes into the real tables, all-or-nothing (one transaction).
 * skipExisting: a quiz whose name already exists under the topic is left alone (makes re-running an import safe).
 */
export async function importQuizzes(topic: string, quizzesData: ImportQuiz[], opts: { subjectId?: number; skipExisting?: boolean } = {}): Promise<ImportResult> {
  return withTransaction(async (q) => {
    let topicRow = (await q('SELECT id FROM topics WHERE lower(name) = lower($1)', [topic.trim()])).rows[0];
    if (!topicRow) {
      const subj = Number.isInteger(opts.subjectId)
        ? (await q('SELECT id FROM subjects WHERE id = $1', [opts.subjectId])).rows[0]
        : (await q('SELECT id FROM subjects ORDER BY id LIMIT 1')).rows[0];
      if (!subj) throw Object.assign(new Error('No subject to attach the new topic to'), { status: 400 });
      topicRow = (await q('INSERT INTO topics (subject_id, name, difficulty) VALUES ($1, $2, $3) RETURNING id', [subj.id, topic.trim(), 'medium'])).rows[0];
    }

    const year = new Date().getFullYear();
    const result: ImportResult = { quizzes: 0, questions: 0, skipped: [] };
    for (const quiz of quizzesData) {
      if (opts.skipExisting) {
        const exists = await q('SELECT 1 AS ok FROM quiz_tests WHERE topic_id = $1 AND lower(name) = lower($2)', [topicRow.id, quiz.quiz_name.trim()]);
        if (exists.rows.length > 0) {
          result.skipped.push(quiz.quiz_name.trim());
          continue;
        }
      }
      const qz = (
        await q('INSERT INTO quiz_tests (topic_id, name, total_qs, duration_mins, year) VALUES ($1, $2, $3, $4, $5) RETURNING id', [
          topicRow.id,
          quiz.quiz_name.trim(),
          quiz.questions.length,
          quiz.questions.length, // one minute per question
          year,
        ])
      ).rows[0];
      result.quizzes++;
      let order = 1;
      for (const qn of quiz.questions) {
        const qb = (
          await q('INSERT INTO question_bank (topic_id, question_text, difficulty, year, language) VALUES ($1, $2, $3, $4, $5) RETURNING id', [topicRow.id, qn.question.trim(), 'medium', year, 'English'])
        ).rows[0];
        for (const label of OPTION_LABELS) {
          if (qn.options[label] === undefined) continue;
          await q('INSERT INTO options (question_id, label, text, is_correct) VALUES ($1, $2, $3, $4)', [qb.id, label, qn.options[label].trim(), qn.correct_option === label]);
        }
        await q('INSERT INTO explanations (question_id, short_answer, detailed_text) VALUES ($1, $2, $3)', [
          qb.id,
          `Correct Answer: ${qn.correct_option}`,
          (qn.explanation || 'No explanation available.').trim(),
        ]);
        await q('INSERT INTO quiz_question_map (quiz_id, question_id, sort_order) VALUES ($1, $2, $3)', [qz.id, qb.id, order++]);
        result.questions++;
      }
    }
    return result;
  });
}
