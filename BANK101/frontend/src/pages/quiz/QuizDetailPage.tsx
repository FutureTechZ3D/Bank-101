import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNavStore } from '../../app/store/navStore';
import { useExamStore } from '../../app/store/examStore';

export default function QuizDetailPage() {
  const navigate = useNavigate();
  const { selectedQuiz } = useNavStore();
  const { startExam } = useExamStore();
  const [loading, setLoading] = useState(false);
  const [fullQuiz, setFullQuiz] = useState<any>(null);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedQuiz) return;
    setLoading(true);
    api(`/quizzes/detail/${selectedQuiz.quiz_id ?? selectedQuiz.id}`).then((r) => {
      setFullQuiz(r.ok && r.data.success ? r.data.quiz : null);
      setLoading(false);
    });
  }, [selectedQuiz]);

  const handleStart = async () => {
    if (!selectedQuiz) return;
    setLoading(true);
    setStartError(null);
    const r = await startExam(selectedQuiz.quiz_id ?? selectedQuiz.id);
    setLoading(false);
    if (r.ok) navigate('/exam');
    else setStartError(r.message || 'Could not start the quiz.');
  };

  if (!selectedQuiz) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No quiz selected.{' '}
        <button onClick={() => navigate('/quizzes')} className="text-blue-500 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] flex items-center justify-center p-6 md:p-10 transition-colors duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-2xl">
        <button
          onClick={() => navigate('/quizzes')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 font-bold cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Cancel
        </button>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-8 text-center leading-snug">
          {selectedQuiz.quiz_name ?? selectedQuiz.name}
        </h2>

        {loading ? (
          <div className="text-center font-bold text-slate-500 py-10 animate-pulse text-xs">Preparing questions...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: fullQuiz?.total_qs ?? '—', label: 'Questions' },
                { value: fullQuiz ? `${fullQuiz.duration_mins} min` : '—', label: 'Duration' },
                { value: '10 pts', label: 'Per Answer' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="font-black text-lg text-slate-900 dark:text-white mb-0.5">{s.value}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
              <span className="font-black block mb-1">Testing Protocol:</span>
              Ensure a stable connection. Hints deduct from your quota (10 free, unlimited for Pro). The timer runs server-side — leaving the window does not pause it.
            </div>

            {startError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {startError}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-xs py-4 rounded-xl shadow-lg shadow-blue-500/10 transition-all uppercase tracking-widest cursor-pointer mt-4 disabled:opacity-60"
            >
              Start Exam Simulator
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
