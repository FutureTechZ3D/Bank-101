import { Response } from 'express';
import { AuthenticatedRequest, currentTier } from '../../middleware/auth.middleware';
import { query, withTransaction } from '../../config/db';

const FREE_HINTS_PER_ATTEMPT = 10;
const GRACE_SECONDS = 30; // network slack after the quiz timer ends
const LABELS = ['A', 'B', 'C', 'D', 'E']; // option E exists only on five-option questions

function serverError(res: Response, err: unknown) {
  console.error('Quiz API error:', err); // details stay in the server log
  return res.status(500).json({ success: false, message: 'Internal server error' });
}

/** Whole positive number from a query/body value, else null (avoids SQL type errors that became 500s). */
function toInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (typeof v === 'string' && /^[0-9]{1,9}$/.test(v) && Number(v) > 0) return Number(v);
  return null;
}

/** Loads an attempt and checks it belongs to the user. Returns null if it is not theirs / does not exist. */
async function loadOwnAttempt(attemptId: number, userId: number) {
  const r = await query(
    `SELECT a.id, a.user_id, a.quiz_id, a.started_at, a.submitted_at, a.status,
            t.duration_mins
       FROM quiz_attempts a JOIN quiz_tests t ON t.id = a.quiz_id
      WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId]
  );
  return r.rows[0] || null;
}

/** Loads scoring config (marks_per_question, negative_marks) for a quiz. */
async function loadScoringConfig(quizId: number): Promise<{ marksPerQ: number; negMarks: number }> {
  const r = await query('SELECT negative_marks, marks_per_question FROM quiz_tests WHERE id = $1', [quizId]);
  const row = r.rows[0] || {};
  return {
    marksPerQ: Number(row.marks_per_question ?? 1) || 1,
    negMarks: Number(row.negative_marks ?? 0) || 0,
  };
}

function pastDeadline(attempt: any): boolean {
  const durationMins = Number(attempt.duration_mins) || 50; // fallback to 50 mins if null/0
  const end = new Date(attempt.started_at).getTime() + durationMins * 60000 + GRACE_SECONDS * 1000;
  return Date.now() > end;
}

async function questionInQuiz(quizId: number, questionId: number): Promise<boolean> {
  const r = await query('SELECT 1 AS ok FROM quiz_question_map WHERE quiz_id = $1 AND question_id = $2', [quizId, questionId]);
  return r.rows.length > 0;
}

// 1. Get Exam Categories
export async function getExamCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await query('SELECT * FROM exam_categories ORDER BY id');
    return res.status(200).json({ success: true, categories: result.rows });
  } catch (err) {
    return serverError(res, err);
  }
}

// 2. Get Exam Types
export async function getExamTypes(req: AuthenticatedRequest, res: Response) {
  const categoryId = req.query.category_id;
  try {
    if (categoryId !== undefined && toInt(categoryId) === null) {
      return res.status(400).json({ success: false, message: 'category_id must be a positive integer' });
    }
    const result = categoryId
      ? await query('SELECT * FROM exam_types WHERE category_id = $1 ORDER BY id', [toInt(categoryId)])
      : await query('SELECT * FROM exam_types ORDER BY id');
    return res.status(200).json({ success: true, exam_types: result.rows });
  } catch (err) {
    return serverError(res, err);
  }
}

// 3. Get Subjects
export async function getSubjects(req: AuthenticatedRequest, res: Response) {
  const examTypeId = req.query.exam_type_id;
  try {
    if (examTypeId !== undefined && toInt(examTypeId) === null) {
      return res.status(400).json({ success: false, message: 'exam_type_id must be a positive integer' });
    }
    const result = examTypeId
      ? await query('SELECT * FROM subjects WHERE exam_type_id = $1 ORDER BY sort_order', [toInt(examTypeId)])
      : await query('SELECT * FROM subjects ORDER BY sort_order');
    return res.status(200).json({ success: true, subjects: result.rows });
  } catch (err) {
    return serverError(res, err);
  }
}

// 4. Get Quizzes (topic by id or by name; question counts come from the database)
export async function getQuizzes(req: AuthenticatedRequest, res: Response) {
  const topicParam = req.query.topic_id || req.query.topic || req.params.topic;
  try {
    let where = '';
    const params: any[] = [];
    if (topicParam) {
      let topicIds: number[] = [];
      const asId = toInt(topicParam);
      if (asId !== null) {
        topicIds = [asId];
      } else {
        // The app's menu lists names such as "Simplification". A name can be a topic ("BODMAS Rule")
        // or a subject (all topics under it), so try the topic first, then the subject.
        // Both are combined: an admin may import a topic that has the same name as a subject.
        const name = String(topicParam);
        const t = await query('SELECT id FROM topics WHERE lower(name) = lower($1)', [name]);
        const s = await query('SELECT tp.id FROM topics tp JOIN subjects sb ON sb.id = tp.subject_id WHERE lower(sb.name) = lower($1)', [name]);
        topicIds = Array.from(new Set([...t.rows, ...s.rows].map((r: any) => r.id)));
        if (topicIds.length === 0) return res.status(200).json({ success: true, quizzes: [] });
      }
      where = `WHERE t.topic_id IN (${topicIds.map((_, i) => '$' + (i + 1)).join(', ')})`;
      params.push(...topicIds);
    }
    const result = await query(
      `SELECT t.id, t.name, t.duration_mins, count(m.question_id) AS question_count
         FROM quiz_tests t LEFT JOIN quiz_question_map m ON m.quiz_id = t.id
         ${where}
         GROUP BY t.id, t.name, t.duration_mins
         ORDER BY t.id`,
      params
    );
    const quizzes = result.rows.map((q: any) => ({
      quiz_id: q.id,
      quiz_name: q.name,
      duration_mins: q.duration_mins,
      questions: { length: Number(q.question_count) },
    }));
    return res.status(200).json({ success: true, quizzes });
  } catch (err) {
    return serverError(res, err);
  }
}

// 5. Get Quiz Details
export async function getQuizDetails(req: AuthenticatedRequest, res: Response) {
  const quizId = toInt(req.params.id);
  if (quizId === null) return res.status(400).json({ success: false, message: 'Invalid quiz id' });
  try {
    const result = await query('SELECT * FROM quiz_tests WHERE id = $1', [quizId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    return res.status(200).json({ success: true, quiz: result.rows[0] });
  } catch (err) {
    return serverError(res, err);
  }
}

// 6. Get Questions (never returns is_correct)
export async function getQuestions(req: AuthenticatedRequest, res: Response) {
  const quizId = toInt(req.query.quiz_id);
  if (quizId === null) {
    return res.status(400).json({ success: false, message: 'quiz_id (positive integer) is required' });
  }
  try {
    const result = await query(
      `SELECT q.id, q.question_text, q.difficulty, q.question_type
         FROM question_bank q JOIN quiz_question_map m ON q.id = m.question_id
        WHERE m.quiz_id = $1 ORDER BY m.sort_order`,
      [quizId]
    );
    const questions = [];
    for (const row of result.rows) {
      const optionsResult = await query('SELECT label, text FROM options WHERE question_id = $1 ORDER BY label', [row.id]);
      const options: any = {};
      optionsResult.rows.forEach((o: any) => {
        options[String(o.label).trim()] = o.text;
      });
      questions.push({
        id: row.id,
        question: row.question_text,
        difficulty: row.difficulty,
        question_type: row.question_type || 'single_mcq',
        options,
      });
    }
    return res.status(200).json({ success: true, questions });
  } catch (err) {
    return serverError(res, err);
  }
}

// 7. Start Attempt
export async function startAttempt(req: AuthenticatedRequest, res: Response) {
  const quizId = toInt(req.body?.quiz_id);
  const userId = req.user?.id;
  if (quizId === null || !userId) {
    return res.status(400).json({ success: false, message: 'quiz_id (positive integer) is required' });
  }
  try {
    const quiz = await query('SELECT id FROM quiz_tests WHERE id = $1', [quizId]);
    if (quiz.rows.length === 0) return res.status(404).json({ success: false, message: 'Quiz not found' });
    const result = await query(
      'INSERT INTO quiz_attempts (user_id, quiz_id, started_at) VALUES ($1, $2, $3) RETURNING id, started_at',
      [userId, quizId, new Date()]
    );
    return res.status(201).json({ success: true, attempt_id: result.rows[0].id, started_at: result.rows[0].started_at });
  } catch (err) {
    return serverError(res, err);
  }
}

// 8. Answer one question (progressive save). Only on your own, unsubmitted, in-time attempt.
export async function answerQuestion(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.body?.attempt_id);
  const questionId = toInt(req.body?.question_id);
  const selected = typeof req.body?.selected_option === 'string' ? req.body.selected_option.trim().toUpperCase() : null;
  const textAnswer = typeof req.body?.text_answer === 'string' ? req.body.text_answer.trim() : null;
  const markedForReview = req.body?.marked_for_review === true;
  const userId = req.user?.id;

  if (attemptId === null || questionId === null || !userId) {
    return res.status(400).json({ success: false, message: 'attempt_id and question_id are required' });
  }

  // At least one of selected_option, text_answer, or marked_for_review must be passed
  if (!selected && textAnswer === null && req.body?.marked_for_review === undefined) {
    return res.status(400).json({ success: false, message: 'attempt_id, question_id and selected_option (A-E) or text_answer are required' });
  }

  const seconds = Math.min(Math.max(Number(req.body?.time_taken_seconds) || 0, 0), 86400);

  try {
    const attempt = await loadOwnAttempt(attemptId, userId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.status === 'submitted' || attempt.submitted_at) return res.status(409).json({ success: false, message: 'This attempt is already submitted' });
    if (pastDeadline(attempt)) return res.status(403).json({ success: false, message: 'Time is over for this attempt' });
    if (!(await questionInQuiz(attempt.quiz_id, questionId))) {
      return res.status(400).json({ success: false, message: 'This question is not part of the quiz' });
    }

    // Inspect question type
    const qRow = await query('SELECT question_type, numerical_answer, numerical_tolerance FROM question_bank WHERE id = $1', [questionId]);
    const qType = qRow.rows[0]?.question_type || 'single_mcq';

    let isCorrect = false;

    if (qType === 'numerical') {
      if (textAnswer !== null) {
        const val = Number(textAnswer);
        const target = Number(qRow.rows[0]?.numerical_answer ?? 0);
        const tol = Number(qRow.rows[0]?.numerical_tolerance ?? 0.001);
        isCorrect = !isNaN(val) && Math.abs(val - target) <= tol;
      }
    } else if (selected) {
      if (!LABELS.includes(selected)) {
        return res.status(400).json({ success: false, message: 'selected_option must be A-E' });
      }
      const opt = await query('SELECT is_correct FROM options WHERE question_id = $1 AND label = $2', [questionId, selected]);
      if (opt.rows.length === 0) return res.status(400).json({ success: false, message: 'This question has no such option' });
      isCorrect = opt.rows[0].is_correct === true;
    }

    // Upsert into attempt_answers
    await query(
      `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, text_answer, marked_for_review, is_correct, time_taken_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET
         selected_option = COALESCE(EXCLUDED.selected_option, attempt_answers.selected_option),
         text_answer = COALESCE(EXCLUDED.text_answer, attempt_answers.text_answer),
         marked_for_review = EXCLUDED.marked_for_review,
         is_correct = EXCLUDED.is_correct,
         time_taken_seconds = EXCLUDED.time_taken_seconds`,
      [attemptId, questionId, selected, textAnswer, markedForReview, isCorrect, seconds]
    );

    return res.status(200).json({
      success: true,
      message: 'Answer saved',
      marked_for_review: markedForReview,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

// 8b. Get Attempt State for Reconnection & Recovery
export async function getAttemptState(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.params.id);
  const userId = req.user?.id;
  if (attemptId === null || !userId) {
    return res.status(400).json({ success: false, message: 'Invalid attempt id' });
  }

  try {
    const attempt = await loadOwnAttempt(attemptId, userId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const duration = attempt.duration_minutes || 50;
    const deadlineMs = new Date(attempt.started_at).getTime() + (duration * 60 + 30) * 1000;
    const secondsRemaining = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));

    const qList = await query(
      `SELECT q.id, q.question_text, q.question_type, q.difficulty, q.passage_text, q.numerical_answer
         FROM quiz_question_map m
         JOIN question_bank q ON q.id = m.question_id
        WHERE m.quiz_id = $1
        ORDER BY q.id ASC`,
      [attempt.quiz_id]
    );

    const answersRes = await query(
      `SELECT question_id, selected_option, text_answer, marked_for_review, time_taken_seconds
         FROM attempt_answers
        WHERE attempt_id = $1`,
      [attemptId]
    );
    const answersMap = new Map();
    answersRes.rows.forEach((a: any) => answersMap.set(a.question_id, a));

    const palette = qList.rows.map((q: any) => {
      const ans = answersMap.get(q.id);
      let status = 'unvisited';
      if (ans) {
        const isAnswered = ans.selected_option !== null || ans.text_answer !== null;
        if (ans.marked_for_review && isAnswered) {
          status = 'answered_and_marked_for_review';
        } else if (ans.marked_for_review) {
          status = 'marked_for_review';
        } else if (isAnswered) {
          status = 'answered';
        } else {
          status = 'visited_unanswered';
        }
      }
      return {
        question_id: q.id,
        status,
        saved_answer: ans?.selected_option || ans?.text_answer || null,
        marked_for_review: ans?.marked_for_review === true,
      };
    });

    return res.status(200).json({
      success: true,
      attempt: {
        id: attempt.id,
        quiz_id: attempt.quiz_id,
        quiz_name: attempt.quiz_name,
        started_at: attempt.started_at,
        duration_minutes: duration,
        seconds_remaining: secondsRemaining,
        status: attempt.status,
      },
      palette,
      answers: answersRes.rows,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

// 9. Submit and grade (once). Score is computed on the server from the saved answers.
export async function submitAttempt(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.body?.attempt_id);
  const userId = req.user?.id;
  if (attemptId === null || !userId) {
    return res.status(400).json({ success: false, message: 'attempt_id (positive integer) is required' });
  }

  try {
    const attempt = await loadOwnAttempt(attemptId, userId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const out = await withTransaction(async (q) => {
      // Only the first submit wins: UPDATE matches only while status is still 'in_progress'.
      const claimed = await q(
        `UPDATE quiz_attempts SET submitted_at = $1, status = 'submitted'
          WHERE id = $2 AND user_id = $3 AND status = 'in_progress' RETURNING id`,
        [new Date(), attemptId, userId]
      );
      if (claimed.rows.length === 0) return null;

      const total = Number((await q('SELECT count(*) AS count FROM quiz_question_map WHERE quiz_id = $1', [attempt.quiz_id])).rows[0].count);
      const answers = (await q('SELECT is_correct FROM attempt_answers WHERE attempt_id = $1', [attemptId])).rows;
      const answered = answers.length;
      const correct = answers.filter((a: any) => a.is_correct === true || a.is_correct === 't' || a.is_correct === 1).length;
      const wrong = answered - correct;
      const unanswered = Math.max(total - answered, 0);

      // Negative marking: load scoring config from quiz_tests
      const { marksPerQ, negMarks } = await loadScoringConfig(attempt.quiz_id);
      const rawScore = (correct * marksPerQ) - (wrong * negMarks);
      const maxScore = total * marksPerQ;
      const percentage = maxScore > 0 ? Math.min(100, Math.max(0, Math.round((rawScore / maxScore) * 10000) / 100)) : 0;

      await q('UPDATE quiz_attempts SET score = $1 WHERE id = $2', [Math.round(rawScore), attemptId]);
      const results = await q(
        'INSERT INTO results (attempt_id, total, correct, wrong, unanswered, percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [attemptId, total, correct, wrong, unanswered, percentage]
      );

      const pointsGained = Math.max(0, Math.round(rawScore * 10));
      await q('UPDATE users SET points = points + $1, streak_days = streak_days + 1 WHERE id = $2', [pointsGained, userId]);
      const user = (await q('SELECT points, streak_days FROM users WHERE id = $1', [userId])).rows[0];
      return { results: results.rows[0], pointsGained, user };
    });

    if (!out) return res.status(409).json({ success: false, message: 'This attempt was already submitted' });
    return res.status(200).json({
      success: true,
      message: 'Attempt graded and saved successfully',
      results: out.results,
      points_gained: out.pointsGained,
      user: { points: out.user?.points || 0, streak_days: out.user?.streak_days || 0 },
    });
  } catch (err) {
    return serverError(res, err);
  }
}

async function hintsUsed(userId: number, attemptId: number): Promise<number> {
  const r = await query('SELECT count(*) AS count FROM hint_usage WHERE user_id = $1 AND quiz_attempt_id = $2', [userId, attemptId]);
  return Number(r.rows[0].count);
}

// 10. Hint. The tier is read from the database. Free: 10 per attempt, answer only. Pro: unlimited, answer + explanation.
export async function useHint(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.body?.quiz_attempt_id);
  const questionId = toInt(req.body?.question_id);
  const userId = req.user?.id;
  if (attemptId === null || questionId === null || !userId) {
    return res.status(400).json({ success: false, message: 'quiz_attempt_id and question_id are required' });
  }

  try {
    // The attempt must be the caller's own, still open. Without this a user could pass any id to reset the quota.
    const attempt = await loadOwnAttempt(attemptId, userId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.status === 'submitted' || attempt.submitted_at) return res.status(409).json({ success: false, message: 'This attempt is already submitted' });
    if (!(await questionInQuiz(attempt.quiz_id, questionId))) {
      return res.status(400).json({ success: false, message: 'This question is not part of the quiz' });
    }

    const tier = await currentTier(userId);
    const unlimited = tier === 'Pro' || tier === 'Admin';
    // Count + insert must be one atomic step per attempt. Found on a real PostgreSQL: 15 parallel requests each saw
    // "9 used" and all inserted (13 hints stored for a limit of 10). Locking the attempt row makes them queue up.
    const granted = await withTransaction(async (q) => {
      if (!unlimited) {
        await q('SELECT id FROM quiz_attempts WHERE id = $1 FOR UPDATE', [attemptId]);
        const used = Number((await q('SELECT count(*) AS count FROM hint_usage WHERE user_id = $1 AND quiz_attempt_id = $2', [userId, attemptId])).rows[0].count);
        if (used >= FREE_HINTS_PER_ATTEMPT) return false;
      }
      await q('INSERT INTO hint_usage (user_id, quiz_attempt_id, question_id) VALUES ($1, $2, $3)', [userId, attemptId, questionId]);
      return true;
    });
    if (!granted) {
      return res.status(403).json({ success: false, message: `Hint quota exceeded. Free tier is limited to ${FREE_HINTS_PER_ATTEMPT} hints per quiz.` });
    }

    const correct = await query('SELECT label FROM options WHERE question_id = $1 AND is_correct = true', [questionId]);
    const correctLetter = correct.rows[0] ? String(correct.rows[0].label).trim() : null;

    if (unlimited) {
      const expl = await query('SELECT detailed_text FROM explanations WHERE question_id = $1', [questionId]);
      return res.status(200).json({
        success: true,
        correct_answer: correctLetter,
        explanation: expl.rows[0]?.detailed_text || 'No explanation available.',
        tier: 'Pro',
      });
    }
    return res.status(200).json({
      success: true,
      correct_answer: correctLetter,
      tier: 'Free',
      remaining_hints: Math.max(0, FREE_HINTS_PER_ATTEMPT - (await hintsUsed(userId, attemptId))),
    });
  } catch (err) {
    return serverError(res, err);
  }
}

// 11. Remaining hints
export async function getHintCount(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.query.quiz_attempt_id);
  const userId = req.user?.id;
  if (attemptId === null || !userId) {
    return res.status(400).json({ success: false, message: 'quiz_attempt_id is required' });
  }
  try {
    const attempt = await loadOwnAttempt(attemptId, userId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    const tier = await currentTier(userId);
    if (tier === 'Pro' || tier === 'Admin') {
      return res.status(200).json({ success: true, unlimited: true, remaining: -1 });
    }
    const used = await hintsUsed(userId, attemptId);
    return res.status(200).json({ success: true, unlimited: false, remaining: Math.max(0, FREE_HINTS_PER_ATTEMPT - used) });
  } catch (err) {
    return serverError(res, err);
  }
}

// 12. Result of YOUR submitted attempt, with the answer review
export async function getResultByAttempt(req: AuthenticatedRequest, res: Response) {
  const attemptId = toInt(req.params.attemptId);
  const userId = req.user?.id;
  if (attemptId === null || !userId) {
    return res.status(400).json({ success: false, message: 'attemptId is required' });
  }
  try {
    const result = await query(
      'SELECT r.* FROM results r JOIN quiz_attempts a ON r.attempt_id = a.id WHERE r.attempt_id = $1 AND a.user_id = $2',
      [attemptId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    const quizId = (await query('SELECT quiz_id FROM quiz_attempts WHERE id = $1', [attemptId])).rows[0]?.quiz_id;
    const questions = await query(
      `SELECT q.id, q.question_text FROM question_bank q JOIN quiz_question_map m ON q.id = m.question_id
        WHERE m.quiz_id = $1 ORDER BY m.sort_order`,
      [quizId]
    );
    const review = [];
    for (const q of questions.rows) {
      const opts = await query('SELECT label, text, is_correct FROM options WHERE question_id = $1 ORDER BY label', [q.id]);
      const options: any = {};
      let correctOption: string | null = null;
      opts.rows.forEach((o: any) => {
        const label = String(o.label).trim();
        options[label] = o.text;
        if (o.is_correct === true) correctOption = label;
      });
      const expl = await query('SELECT detailed_text FROM explanations WHERE question_id = $1', [q.id]);
      const ans = await query('SELECT selected_option FROM attempt_answers WHERE attempt_id = $1 AND question_id = $2', [attemptId, q.id]);
      review.push({
        id: q.id,
        question: q.question_text,
        options,
        correct_answer: correctOption,
        selected_option: ans.rows[0]?.selected_option ? String(ans.rows[0].selected_option).trim() : null,
        explanation: expl.rows[0]?.detailed_text || 'No explanation available.',
      });
    }
    return res.status(200).json({ success: true, result: result.rows[0], review });
  } catch (err) {
    return serverError(res, err);
  }
}

// 13. Leaderboard (real users from the database; admins are not ranked)
export async function getLeaderboard(req: AuthenticatedRequest, res: Response) {
  try {
    const r = await query(
      `SELECT id, username, points, streak_days, account_type FROM users
        WHERE account_type <> 'Admin' ORDER BY points DESC, id ASC LIMIT 100`
    );
    return res.status(200).json({ success: true, leaderboard: r.rows });
  } catch (err) {
    return serverError(res, err);
  }
}

// 14. Certificates: submitted attempts with >= 80 percent. The certificate id is stable (no random part).
export async function getCertificates(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const r = await query(
      `SELECT a.id AS attempt_id, a.submitted_at, t.name AS quiz_name, r.correct, r.total, r.percentage
         FROM quiz_attempts a
         JOIN results r ON r.attempt_id = a.id
         JOIN quiz_tests t ON t.id = a.quiz_id
        WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL AND r.percentage >= 80
        ORDER BY a.id`,
      [userId]
    );
    const certificates = r.rows.map((x: any) => ({
      id: x.attempt_id,
      certificate_id: `CERT-101-${userId}-${x.attempt_id}`,
      quiz_name: x.quiz_name,
      score: x.correct,
      total: x.total,
      percentage: Math.round(Number(x.percentage)),
      issued_at: x.submitted_at,
    }));
    return res.status(200).json({ success: true, certificates });
  } catch (err) {
    return serverError(res, err);
  }
}

// 15. Performance analytics from the user's submitted attempts
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const r = await query(
      `SELECT a.id AS attempt_id, a.submitted_at, t.name AS quiz_name, tp.name AS topic_name, r.correct, r.total, r.percentage
         FROM quiz_attempts a
         JOIN results r ON r.attempt_id = a.id
         JOIN quiz_tests t ON t.id = a.quiz_id
         LEFT JOIN topics tp ON tp.id = t.topic_id
        WHERE a.user_id = $1 AND a.submitted_at IS NOT NULL
        ORDER BY a.id`,
      [userId]
    );
    const rows = r.rows;
    const totalAttempts = rows.length;
    let sumPct = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    const topicStats: Record<string, { total: number; correct: number; count: number }> = {};
    const weekly: any[] = [];
    for (const x of rows) {
      sumPct += Number(x.percentage);
      totalCorrect += Number(x.correct);
      totalQuestions += Number(x.total);
      if (x.topic_name) {
        const s = (topicStats[x.topic_name] ||= { total: 0, correct: 0, count: 0 });
        s.total += Number(x.total);
        s.correct += Number(x.correct);
        s.count += 1;
      }
      weekly.push({
        date: new Date(x.submitted_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        score: Math.round(Number(x.percentage)),
        quiz_name: x.quiz_name || 'Practice Quiz',
      });
    }
    return res.status(200).json({
      success: true,
      analytics: {
        totalAttempts,
        averagePercentage: totalAttempts > 0 ? Math.round(sumPct / totalAttempts) : 0,
        totalCorrect,
        totalQuestions,
        topicsPerformance: Object.entries(topicStats).map(([topic, s]) => ({
          topic,
          accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
          quizzesCount: s.count,
        })),
        weeklyProgress: weekly.slice(-7),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
}
