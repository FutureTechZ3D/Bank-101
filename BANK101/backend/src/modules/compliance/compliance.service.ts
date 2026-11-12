import { query } from '../../config/db';

export class ComplianceService {
  /** Logs DPDP consent record with timestamp and digital fingerprint. */
  static async recordConsent(params: {
    userId: number;
    purposeCode: string;
    consentGiven: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const res = await query(
      `INSERT INTO dpdp_consent_records (user_id, purpose_code, consent_given, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.userId, params.purposeCode, params.consentGiven, params.ipAddress || null, params.userAgent || null]
    );
    return res.rows[0];
  }

  /** Retrieves user's active and historical DPDP consent events. */
  static async getConsentHistory(userId: number) {
    const res = await query(
      `SELECT * FROM dpdp_consent_records
       WHERE user_id = $1
       ORDER BY consent_timestamp DESC`,
      [userId]
    );
    return res.rows;
  }

  /** Right to Data Portability: Exports comprehensive user archive. */
  static async exportPersonalData(userId: number) {
    const userRes = await query(
      `SELECT id, username, phone, account_type, points, streak_days, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) return null;

    const attemptsRes = await query(
      `SELECT qa.id, qa.quiz_id, qa.score, qa.status, qa.started_at, qa.submitted_at,
              r.percentage, r.correct, r.wrong, r.unanswered
       FROM quiz_attempts qa
       LEFT JOIN results r ON r.attempt_id = qa.id
       WHERE qa.user_id = $1
       ORDER BY qa.started_at DESC`,
      [userId]
    );

    const tutorRes = await query(
      `SELECT s.id, s.exam_id, s.language, s.created_at,
              (SELECT count(*)::int FROM ai_tutor_messages WHERE session_id = s.id) AS messages_count
       FROM ai_tutor_sessions s
       WHERE s.user_id = $1`,
      [userId]
    );

    const consentRes = await query(
      `SELECT purpose_code, consent_given, consent_timestamp, withdrawn_at
       FROM dpdp_consent_records
       WHERE user_id = $1`,
      [userId]
    );

    return {
      exportedAt: new Date().toISOString(),
      complianceStandard: 'India Digital Personal Data Protection (DPDP) Act, 2023',
      user: userRes.rows[0],
      quizAttempts: attemptsRes.rows,
      aiTutorSessions: tutorRes.rows,
      consentRecords: consentRes.rows,
    };
  }

  /** Right to Erasure / Right to be Forgotten: Logs and processes anonymization. */
  static async requestDataErasure(userId: number, reason?: string) {
    const reqRes = await query(
      `INSERT INTO data_subject_requests (user_id, request_type, status, resolution_notes)
       VALUES ($1, 'DATA_ERASURE', 'completed', $2)
       RETURNING *`,
      [userId, reason || 'User invoked Right to Erasure under Section 12 of DPDP Act']
    );

    // Anonymize personal identifiable information
    await query(
      `UPDATE users
       SET phone = '0000000000',
           username = 'deleted_user_' || id
       WHERE id = $1`,
      [userId]
    );

    return reqRes.rows[0];
  }

  /**
   * Offline Exam Sync Ingestion:
   * Safely receives cached CBT attempt bundles executed in disconnected environments.
   */
  static async syncOfflineAttempt(params: {
    userId: number;
    clientAttemptUuid: string;
    quizId: number;
    clientStartedAt: string;
    clientSubmittedAt: string;
    answers: Array<{ questionId: number; selectedOption: string }>;
  }) {
    // 1. Idempotency check: verify if this attempt UUID was already synced
    const existingSync = await query(
      `SELECT * FROM offline_sync_logs WHERE client_attempt_uuid = $1`,
      [params.clientAttemptUuid]
    );
    if (existingSync.rows.length > 0) {
      return { status: 'already_synced', syncLog: existingSync.rows[0] };
    }

    // 2. Fetch quiz details & answer keys
    const questionsRes = await query(
      `SELECT q.id, o.label AS correct_option
       FROM question_bank q
       JOIN quiz_question_map qtq ON qtq.question_id = q.id
       LEFT JOIN options o ON o.question_id = q.id AND o.is_correct = TRUE
       WHERE qtq.quiz_id = $1`,
      [params.quizId]
    );

    const keyMap = new Map<number, string>();
    for (const q of questionsRes.rows) {
      keyMap.set(q.id, q.correct_option);
    }

    // 3. Evaluate answers
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const ans of params.answers) {
      const correctOpt = keyMap.get(ans.questionId);
      if (!ans.selectedOption) {
        unansweredCount++;
      } else if (ans.selectedOption === correctOpt) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const totalQuestions = questionsRes.rows.length || params.answers.length || 1;
    const score = correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // 4. Create attempt record
    const attemptRes = await query(
      `INSERT INTO quiz_attempts (user_id, quiz_id, started_at, submitted_at, score, status)
       VALUES ($1, $2, $3, $4, $5, 'submitted')
       RETURNING id`,
      [params.userId, params.quizId, params.clientStartedAt, params.clientSubmittedAt, score]
    );
    const attemptId = attemptRes.rows[0].id;

    // 5. Create results record
    await query(
      `INSERT INTO results (attempt_id, total, correct, wrong, unanswered, percentage)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attemptId, totalQuestions, correctCount, wrongCount, unansweredCount, percentage]
    );

    // 6. Save attempt answers
    for (const ans of params.answers) {
      const isCorrect = keyMap.get(ans.questionId) === ans.selectedOption;
      await query(
        `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (attempt_id, question_id) DO NOTHING`,
        [attemptId, ans.questionId, ans.selectedOption || null, isCorrect]
      );
    }

    // 7. Log offline sync event
    const syncRes = await query(
      `INSERT INTO offline_sync_logs (
         user_id, client_attempt_uuid, quiz_id, total_answers,
         client_started_at, client_submitted_at, sync_status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'synced')
       RETURNING *`,
      [
        params.userId,
        params.clientAttemptUuid,
        params.quizId,
        params.answers.length,
        params.clientStartedAt,
        params.clientSubmittedAt,
      ]
    );

    return {
      status: 'synced',
      attemptId,
      score,
      percentage,
      syncLog: syncRes.rows[0],
    };
  }
}
