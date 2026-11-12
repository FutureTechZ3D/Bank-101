import { query } from '../../config/db';

export class InstitutionService {
  /** Lists all active institutions and coaching academies. */
  static async listInstitutions() {
    const res = await query(
      `SELECT inst.*,
              (SELECT count(*)::int FROM institution_members WHERE institution_id = inst.id) AS members_count,
              (SELECT count(*)::int FROM institution_batches WHERE institution_id = inst.id) AS batches_count
       FROM institutions inst
       WHERE inst.is_verified = TRUE
       ORDER BY inst.name ASC`
    );
    return res.rows;
  }

  /** Retrieves detailed view of an institution including its batches and user's role. */
  static async getInstitutionDetail(slug: string, userId?: number) {
    const instRes = await query(`SELECT * FROM institutions WHERE slug = $1`, [slug]);
    if (instRes.rows.length === 0) return null;

    const inst = instRes.rows[0];

    const batchesRes = await query(
      `SELECT b.*, e.title AS target_exam_title, e.code AS target_exam_code,
              (SELECT count(*)::int FROM batch_students WHERE batch_id = b.id) AS student_count,
              (SELECT count(*)::int FROM batch_assigned_tests WHERE batch_id = b.id) AS assigned_tests_count
       FROM institution_batches b
       LEFT JOIN exams e ON b.target_exam_id = e.id
       WHERE b.institution_id = $1
       ORDER BY b.created_at DESC`,
      [inst.id]
    );

    let userRole = null;
    if (userId) {
      const memRes = await query(
        `SELECT role FROM institution_members WHERE institution_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [inst.id, userId]
      );
      if (memRes.rows.length > 0) userRole = memRes.rows[0].role;
    }

    return {
      institution: inst,
      batches: batchesRes.rows,
      userRole,
    };
  }

  /** Joins an institution as student or faculty. */
  static async joinInstitution(institutionId: number, userId: number, role: 'student' | 'faculty' = 'student') {
    const res = await query(
      `INSERT INTO institution_members (institution_id, user_id, role, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (institution_id, user_id)
       DO UPDATE SET is_active = TRUE, role = EXCLUDED.role
       RETURNING *`,
      [institutionId, userId, role]
    );
    return res.rows[0];
  }

  /** Creates a new cohort batch within an institution. */
  static async createBatch(params: {
    institutionId: number;
    name: string;
    targetExamId?: number;
    academicYear?: string;
  }) {
    const res = await query(
      `INSERT INTO institution_batches (institution_id, name, target_exam_id, academic_year)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.institutionId, params.name, params.targetExamId || null, params.academicYear || '2026-2027']
    );
    return res.rows[0];
  }

  /** Enrolls a student into a specific batch. */
  static async enrollStudent(batchId: number, userId: number, enrollmentNo?: string) {
    const res = await query(
      `INSERT INTO batch_students (batch_id, user_id, enrollment_no)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_id, user_id) DO UPDATE SET enrollment_no = EXCLUDED.enrollment_no
       RETURNING *`,
      [batchId, userId, enrollmentNo || `ENR-${Date.now().toString(36).toUpperCase()}`]
    );
    return res.rows[0];
  }

  /** Assigns a test/mock exam to an entire batch. */
  static async assignBatchTest(params: {
    batchId: number;
    quizId: number;
    assignedBy?: number;
    deadline?: string;
    isMandatory?: boolean;
  }) {
    const res = await query(
      `INSERT INTO batch_assigned_tests (batch_id, quiz_id, assigned_by, deadline, is_mandatory)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (batch_id, quiz_id)
       DO UPDATE SET deadline = EXCLUDED.deadline, is_mandatory = EXCLUDED.is_mandatory
       RETURNING *`,
      [params.batchId, params.quizId, params.assignedBy || null, params.deadline || null, params.isMandatory !== false]
    );
    return res.rows[0];
  }

  /** Retrieves batch details, student list, and test schedule. */
  static async getBatchDetails(batchId: number) {
    const batchRes = await query(
      `SELECT b.*, inst.name AS institution_name, e.title AS target_exam_title
       FROM institution_batches b
       JOIN institutions inst ON b.institution_id = inst.id
       LEFT JOIN exams e ON b.target_exam_id = e.id
       WHERE b.id = $1`,
      [batchId]
    );
    if (batchRes.rows.length === 0) return null;

    const studentsRes = await query(
      `SELECT bs.*, u.username, u.phone
       FROM batch_students bs
       JOIN users u ON bs.user_id = u.id
       WHERE bs.batch_id = $1
       ORDER BY bs.enrolled_at ASC`,
      [batchId]
    );

    const testsRes = await query(
      `SELECT bat.*, qt.name AS test_name, qt.total_qs, qt.duration_mins
       FROM batch_assigned_tests bat
       JOIN quiz_tests qt ON bat.quiz_id = qt.id
       WHERE bat.batch_id = $1
       ORDER BY bat.created_at DESC`,
      [batchId]
    );

    return {
      batch: batchRes.rows[0],
      students: studentsRes.rows,
      assignedTests: testsRes.rows,
    };
  }
}
