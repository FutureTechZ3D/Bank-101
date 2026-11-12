/**
 * Exam slice — the live exam engine state and actions.
 * Covers: start → answer → hint → submit → auto-submit on timer.
 */
import { create } from 'zustand';
import { api, errorText } from '../../lib/api';

export interface Question {
  id: number;
  question: string;
  difficulty: string;
  options: Record<string, string>; // A–D, plus optional E
  question_type?: string;
  passage_text?: string;
}

interface ExamState {
  isExamActive: boolean;
  activeAttemptId: number | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, string>; // questionId → selected_option or text_answer
  reviewFlags: Record<number, boolean>; // questionId → marked_for_review
  timeRemaining: number;
  hintsRemaining: number;
  hintsUsed: Record<number, { correct_answer: string; explanation?: string }>;
  examError: string | null;

  // Actions
  setCurrentQuestionIndex: (idx: number) => void;
  clearExamError: () => void;

  startExam: (quizId: number) => Promise<{ ok: boolean; message?: string }>;
  selectAnswer: (questionId: number, option: string) => Promise<void>;
  saveNumericalAnswer: (questionId: number, value: string) => Promise<void>;
  toggleReviewFlag: (questionId: number) => Promise<void>;
  submitExam: () => Promise<boolean>;
  useHint: (questionId: number) => Promise<{ correct_answer: string; explanation?: string } | null>;
  tickTimer: () => void;
  resetExam: () => void;
}

let submitting = false; // prevents double-submit from timer + button race

export const useExamStore = create<ExamState>((set, get) => ({
  isExamActive: false,
  activeAttemptId: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  reviewFlags: {},
  timeRemaining: 0,
  hintsRemaining: 10,
  hintsUsed: {},
  examError: null,

  setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),
  clearExamError: () => set({ examError: null }),

  resetExam: () => {
    submitting = false;
    set({
      isExamActive: false,
      activeAttemptId: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      reviewFlags: {},
      timeRemaining: 0,
      hintsRemaining: 10,
      hintsUsed: {},
      examError: null,
    });
  },

  startExam: async (quizId) => {
    set({ examError: null });
    const fail = (r: any, fallback: string) => ({ ok: false, message: errorText(r, fallback) });

    // 1. Quiz details — get the real duration
    const detail = await api(`/quizzes/detail/${quizId}`);
    if (!detail.ok || !detail.data.success) return fail(detail, 'Could not load the quiz');
    const minutes = Number((detail.data as any).quiz?.duration_mins) || 50;

    // 2. Questions first — don't open an attempt for an empty quiz
    const qs = await api(`/questions?quiz_id=${quizId}`);
    if (!qs.ok || !qs.data.success) return fail(qs, 'Could not load the questions');
    const questions: Question[] = (qs.data as any).questions || [];
    if (questions.length === 0) return { ok: false, message: 'This quiz has no questions yet.' };

    // 3. Create attempt
    const start = await api('/attempts/start', { method: 'POST', body: { quiz_id: quizId } });
    if (!start.ok || !start.data.success) return fail(start, 'Could not start the quiz');
    const attemptId = (start.data as any).attempt_id;

    // 4. Hint count
    const hc = await api(`/hints/count?quiz_attempt_id=${attemptId}`);
    const unlimited = hc.ok && (hc.data as any).unlimited;

    submitting = false;
    set({
      isExamActive: true,
      activeAttemptId: attemptId,
      questions,
      currentQuestionIndex: 0,
      answers: {},
      reviewFlags: {},
      timeRemaining: minutes * 60,
      hintsRemaining: unlimited ? 999 : hc.ok ? Number((hc.data as any).remaining) : 10,
      hintsUsed: {},
      examError: null,
    });
    return { ok: true };
  },

  selectAnswer: async (questionId, option) => {
    const { activeAttemptId, answers, reviewFlags } = get();
    if (!activeAttemptId) return;

    const previous = answers[questionId];
    set({ answers: { ...answers, [questionId]: option }, examError: null });

    const r = await api('/attempts/answer', {
      method: 'POST',
      body: {
        attempt_id: activeAttemptId,
        question_id: questionId,
        selected_option: option,
        marked_for_review: reviewFlags[questionId] || false,
        time_taken_seconds: 10,
      },
    });
    if (r.ok) return;

    // Roll back optimistic update
    const rolledBack = { ...get().answers };
    if (previous === undefined) delete rolledBack[questionId];
    else rolledBack[questionId] = previous;
    set({ answers: rolledBack, examError: errorText(r, 'Your answer could not be saved.') });
    if (r.status === 403) void get().submitExam(); // server says time is over — force submit
  },

  saveNumericalAnswer: async (questionId, value) => {
    const { activeAttemptId, answers, reviewFlags } = get();
    if (!activeAttemptId) return;

    const previous = answers[questionId];
    set({ answers: { ...answers, [questionId]: value }, examError: null });

    const r = await api('/attempts/answer', {
      method: 'POST',
      body: {
        attempt_id: activeAttemptId,
        question_id: questionId,
        text_answer: value,
        marked_for_review: reviewFlags[questionId] || false,
        time_taken_seconds: 10,
      },
    });
    if (r.ok) return;

    const rolledBack = { ...get().answers };
    if (previous === undefined) delete rolledBack[questionId];
    else rolledBack[questionId] = previous;
    set({ answers: rolledBack, examError: errorText(r, 'Your answer could not be saved.') });
  },

  toggleReviewFlag: async (questionId) => {
    const { activeAttemptId, answers, reviewFlags } = get();
    if (!activeAttemptId) return;

    const currentFlag = reviewFlags[questionId] || false;
    const nextFlag = !currentFlag;
    set({ reviewFlags: { ...reviewFlags, [questionId]: nextFlag } });

    await api('/attempts/answer', {
      method: 'POST',
      body: {
        attempt_id: activeAttemptId,
        question_id: questionId,
        selected_option: answers[questionId] || undefined,
        marked_for_review: nextFlag,
        time_taken_seconds: 5,
      },
    });
  },

  submitExam: async () => {
    const { activeAttemptId } = get();
    if (!activeAttemptId || submitting) return false;
    submitting = true;
    try {
      const res = await api('/attempts/submit', { method: 'POST', body: { attempt_id: activeAttemptId } });
      if (!(res.ok && res.data.success) && res.status !== 409) {
        set({ examError: errorText(res, 'Could not submit the quiz. Please try again.') });
        submitting = false;
        return false;
      }
      // Exam finished — results are handled by resultsStore; signal success
      set({ isExamActive: false, activeAttemptId: null, examError: null });
      return true;
    } finally {
      submitting = false;
    }
  },

  useHint: async (questionId) => {
    const { activeAttemptId, hintsUsed } = get();
    if (!activeAttemptId) return null;

    const r = await api('/hints/use', { method: 'POST', body: { quiz_attempt_id: activeAttemptId, question_id: questionId } });
    if (!(r.ok && r.data.success)) {
      set({ examError: errorText(r, 'Could not get a hint.') });
      return null;
    }
    const d: any = r.data;
    const hintObj = { correct_answer: d.correct_answer, explanation: d.explanation || undefined };
    set({
      hintsUsed: { ...hintsUsed, [questionId]: hintObj },
      hintsRemaining: typeof d.remaining_hints === 'number' ? d.remaining_hints : get().hintsRemaining,
      examError: null,
    });
    return hintObj;
  },

  tickTimer: () => {
    const { timeRemaining, isExamActive } = get();
    if (!isExamActive) return;
    if (timeRemaining <= 1) {
      set({ timeRemaining: 0 });
      void get().submitExam();
    } else {
      set({ timeRemaining: timeRemaining - 1 });
    }
  },
}));
