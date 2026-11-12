/**
 * Nav slice — exam hierarchy selection state.
 * Tracks which category / exam type / subject / topic / quiz the user has selected.
 * API loaders live here too so components can call them without touching the exam engine.
 */
import { create } from 'zustand';
import { api } from '../../lib/api';

export interface NavCategory {
  id: string | number;
  label: string;
  icon: string;
  sub?: string;
  color?: string;
  logoUrl?: string;
  types?: NavExamType[];
}

export interface NavExamType {
  id: string | number;
  label: string;
  sub?: string;
  subjects?: NavSubject[];
}

export interface NavSubject {
  id?: string | number;
  name: string;
  icon?: string;
  topics?: NavTopic[];
}

export interface NavTopic {
  id?: string | number;
  name: string;
}

export interface NavQuiz {
  id: number;
  quiz_id?: number;      // alias used by API responses
  name?: string;
  quiz_name?: string;    // alias used by API responses
  total_qs: number;
  duration_mins: number;
  year?: number;
}

interface NavState {
  // DB-loaded data (used when API has that data)
  dbCategories: any[];
  dbExamTypes: any[];
  dbSubjects: any[];
  dbQuizzes: NavQuiz[];

  // Currently selected items (can come from either DB or static HIERARCHY_DATA)
  selectedCategory: NavCategory | null;
  selectedExamType: NavExamType | null;
  selectedSubject: NavSubject | null;
  selectedTopic: NavTopic | null;
  selectedQuiz: NavQuiz | null;

  // Actions
  setSelectedCategory: (cat: NavCategory | null) => void;
  setSelectedExamType: (type: NavExamType | null) => void;
  setSelectedSubject: (sub: NavSubject | null) => void;
  setSelectedTopic: (topic: NavTopic | null) => void;
  setSelectedQuiz: (quiz: NavQuiz | null) => void;

  // API loaders
  loadDbCategories: () => Promise<void>;
  loadDbExamTypes: (categoryId: number) => Promise<void>;
  loadDbSubjects: (examTypeId: number) => Promise<void>;
  loadDbQuizzes: (topicNameOrId: string | number) => Promise<void>;

  clearNavBelow: (level: 'category' | 'examType' | 'subject' | 'topic') => void;
}

export const useNavStore = create<NavState>((set) => {
  const loadList = async (path: string, key: string, field: string) => {
    const r = await api(path);
    if (r.ok && r.data.success) set({ [key]: (r.data as any)[field] ?? [] } as any);
  };

  return {
    dbCategories: [],
    dbExamTypes: [],
    dbSubjects: [],
    dbQuizzes: [],
    selectedCategory: null,
    selectedExamType: null,
    selectedSubject: null,
    selectedTopic: null,
    selectedQuiz: null,

    setSelectedCategory: (cat) => set({ selectedCategory: cat, selectedExamType: null, selectedSubject: null, selectedTopic: null, selectedQuiz: null }),
    setSelectedExamType: (type) => set({ selectedExamType: type, selectedSubject: null, selectedTopic: null, selectedQuiz: null }),
    setSelectedSubject: (sub) => set({ selectedSubject: sub, selectedTopic: null, selectedQuiz: null }),
    setSelectedTopic: (topic) => set({ selectedTopic: topic, selectedQuiz: null }),
    setSelectedQuiz: (quiz) => set({ selectedQuiz: quiz }),

    clearNavBelow: (level) => {
      if (level === 'category') set({ selectedCategory: null, selectedExamType: null, selectedSubject: null, selectedTopic: null, selectedQuiz: null });
      else if (level === 'examType') set({ selectedExamType: null, selectedSubject: null, selectedTopic: null, selectedQuiz: null });
      else if (level === 'subject') set({ selectedSubject: null, selectedTopic: null, selectedQuiz: null });
      else if (level === 'topic') set({ selectedTopic: null, selectedQuiz: null });
    },

    loadDbCategories: () => loadList('/exams/categories', 'dbCategories', 'categories'),
    loadDbExamTypes: (id) => loadList(`/exams/types?category_id=${id}`, 'dbExamTypes', 'exam_types'),
    loadDbSubjects: (id) => loadList(`/subjects?exam_type_id=${id}`, 'dbSubjects', 'subjects'),
    loadDbQuizzes: (nameOrId) => {
      const path = typeof nameOrId === 'number'
        ? `/quizzes?topic_id=${nameOrId}`
        : `/quizzes/${encodeURIComponent(String(nameOrId))}`;
      return loadList(path, 'dbQuizzes', 'quizzes');
    },
  };
});
