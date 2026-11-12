import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNavStore } from '../../app/store/navStore';
import Header from '../../components/common/Header';

export default function QuizListPage() {
  const navigate = useNavigate();
  const { selectedTopic, setSelectedQuiz } = useNavStore();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const topicName = selectedTopic?.name ?? '';

  useEffect(() => {
    if (!topicName) return;
    setLoading(true);
    api(`/quizzes/${encodeURIComponent(topicName)}`).then((r) => {
      setQuizzes(r.ok && r.data.success && Array.isArray(r.data.quizzes) ? r.data.quizzes : []);
      setLoading(false);
    });
  }, [topicName]);

  if (!topicName) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No topic selected.{' '}
        <button onClick={() => navigate('/topics')} className="text-blue-500 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title={topicName}
        subtitle="Select an exam module to begin."
        onBack={() => navigate('/topics')}
        backLabel="Chapters"
      />
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-slate-500 font-bold animate-pulse text-xs">Loading practice modules...</div>
        ) : quizzes.length === 0 ? (
          <div className="text-slate-500 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-2xl text-center text-xs shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-3 block text-slate-400">quiz</span>
            No practice modules available for this topic yet.
            <p className="font-normal text-slate-400 mt-2">
              Try "Simplification" (Bank Exams → IBPS PO → Quantitative Aptitude) which is fully seeded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {quizzes.map((q: any) => (
              <button
                key={q.quiz_id}
                onClick={() => { setSelectedQuiz(q); navigate(`/quizzes/${q.quiz_id}`); }}
                className="group text-left bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer shadow-sm relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-8 h-8 rounded-bl-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                  {q.quiz_id}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-4 mb-6 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {q.quiz_name}
                </h4>
                <div className="mt-auto flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800">
                    {q.questions?.length || 0} questions
                  </span>
                  <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    Enter <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
