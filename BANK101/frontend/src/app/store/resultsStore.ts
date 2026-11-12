/**
 * Results slice — post-exam result and review state.
 * Populated after a successful submitExam; read by ResultPage.
 */
import { create } from 'zustand';
import { api } from '../../lib/api';

export interface ResultSummary {
  attempt_id: number;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
}

export interface ReviewItem {
  id: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  selected_option: string | null;
  explanation: string;
}

/** NUMERIC columns from PostgreSQL arrive as strings; normalize to numbers. */
function normalizeResult(r: any): ResultSummary | null {
  if (!r) return null;
  return {
    attempt_id: Number(r.attempt_id),
    total: Number(r.total),
    correct: Number(r.correct),
    wrong: Number(r.wrong),
    unanswered: Number(r.unanswered),
    percentage: Number(r.percentage),
  };
}

interface ResultsState {
  examResults: ResultSummary | null;
  reviewItems: ReviewItem[];

  loadResults: (attemptId: number, submittedData?: any) => Promise<void>;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  examResults: null,
  reviewItems: [],

  loadResults: async (attemptId, submittedData) => {
    const review = await api(`/results/${attemptId}`);
    const result = normalizeResult(submittedData) ?? (review.ok ? normalizeResult((review.data as any).result) : null);
    set({
      examResults: result,
      reviewItems: review.ok ? (review.data as any).review ?? [] : [],
    });
  },

  clearResults: () => set({ examResults: null, reviewItems: [] }),
}));
