import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../app/store/authStore';
import { useNavStore } from '../../app/store/navStore';
import { useExamStore } from '../../app/store/examStore';
import { useResultsStore } from '../../app/store/resultsStore';
import { api } from '../../lib/api';

function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function QuizEnginePage() {
  const navigate = useNavigate();
  const { user, _setUser } = useAuthStore();
  const { selectedQuiz } = useNavStore();
  const {
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    reviewFlags,
    selectAnswer,
    saveNumericalAnswer,
    toggleReviewFlag,
    timeRemaining,
    tickTimer,
    hintsRemaining,
    hintsUsed,
    useHint,
    submitExam,
    isExamActive,
    activeAttemptId,
    examError,
    clearExamError,
  } = useExamStore();
  const { loadResults } = useResultsStore();

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the timer every second while exam is active
  useEffect(() => {
    timerRef.current = setInterval(() => { tickTimer(); }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [tickTimer]);

  // When the exam finishes (via timer or server expiry), load results and navigate
  useEffect(() => {
    if (!isExamActive && activeAttemptId === null && questions.length > 0) {
      // exam just ended — load results (attempt id was cleared; use the last known one from submit)
    }
  }, [isExamActive]);

  const handleSubmit = async () => {
    setLoadingSubmit(true);
    const currentAttemptId = activeAttemptId;
    try {
      const ok = await submitExam();
      if (ok && currentAttemptId) {
        // Fetch result and updated user in parallel
        const [, userRes] = await Promise.all([
          loadResults(currentAttemptId),
          api('/auth/me').catch(() => null),
        ]);
        // Update points/streak if the backend returned them (some versions return via submit)
        if (userRes?.ok && userRes.data?.user && user) {
          _setUser({ ...user, ...userRes.data.user });
        }
        navigate('/results');
      } else {
        setConfirmSubmit(false);
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  const q = questions[currentQuestionIndex];

  if (!q) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#020617] text-slate-500 font-bold text-xs animate-pulse">
        Loading exam room questions...
      </div>
    );
  }

  const isAnswered = (idx: number) => !!answers[questions[idx]?.id];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#020617] font-sans transition-colors duration-300 w-full overflow-hidden">

      {/* Left — Question Grid Navigation */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-[#0a0f1e] border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-full z-20">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/60">
          <h2 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">Questions Grid</h2>
          <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Answered
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Review
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-5 gap-2.5">
            {questions.map((ques, idx) => {
              const active = idx === currentQuestionIndex;
              const answered = isAnswered(idx);
              const reviewed = !!reviewFlags[ques?.id];
              let cls = 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300';
              if (answered && reviewed) {
                cls = 'bg-purple-600 border-purple-600 text-white font-black';
              } else if (reviewed) {
                cls = 'bg-purple-100 dark:bg-purple-900/40 border-purple-500 text-purple-700 dark:text-purple-300 font-bold';
              } else if (answered) {
                cls = 'bg-emerald-600 border-emerald-600 text-white font-black';
              } else if (active) {
                cls = 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white font-bold';
              }
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center border-2 transition-all cursor-pointer relative ${cls} ${active ? 'ring-2 ring-blue-500/50 scale-105' : ''}`}
                >
                  {idx + 1}
                  {answered && reviewed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/20 flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Tier: {user?.account_type}</span>
          <span className="text-blue-600 dark:text-blue-400">⚡ ACTIVE EXAM</span>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="bg-white dark:bg-[#0a0f1e] border-b border-slate-200 dark:border-slate-800/80 px-8 py-4 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h1 className="font-black text-sm text-slate-900 dark:text-white truncate max-w-[300px]">
              {selectedQuiz?.quiz_name ?? selectedQuiz?.name ?? 'Exam Room'}
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Auto-saves on answer selection</p>
          </div>
          <div className="px-5 py-1.5 rounded-xl flex items-center gap-1.5 border-2 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm">
            <span className="material-symbols-outlined text-[18px] font-bold">alarm</span>
            <span className="font-extrabold text-base md:text-lg">{fmt(timeRemaining)}</span>
          </div>
        </header>

        {examError && (
          <div role="alert" className="bg-red-500/10 border-b border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold px-8 py-2 flex justify-between items-center flex-shrink-0">
            <span>{examError}</span>
            <button onClick={clearExamError} className="underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-xs">
                QUESTION {currentQuestionIndex + 1} OF {questions.length}
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {q.question_type ? q.question_type.toUpperCase().replace('_', ' ') : 'SINGLE MCQ'}
              </span>
            </div>

            <h2 className="text-lg md:text-xl font-medium text-slate-900 dark:text-slate-100 leading-relaxed">{q.question}</h2>

            {/* Numerical Question Input */}
            {q.question_type === 'numerical' ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Enter Numerical Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={answers[q.id] || ''}
                  onChange={(e) => saveNumericalAnswer(q.id, e.target.value)}
                  placeholder="e.g. 42 or 3.1415"
                  className="w-full text-lg font-black px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(q.options || {}).sort().map((opt) => {
                  const text = (q.options as any)[opt];
                  if (!text) return null;
                  const selected = answers[q.id] === opt;
                  return (
                    <button key={opt} onClick={() => selectAnswer(q.id, opt)}
                      className={`w-full flex items-center p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selected ? 'bg-blue-50/50 dark:bg-blue-600/10 border-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs mr-4 flex-shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {opt}
                      </div>
                      <span className={`text-xs md:text-sm font-semibold leading-relaxed ${selected ? 'text-blue-700 dark:text-blue-200 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hint box */}
            {hintsUsed[q.id] && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-[18px]">lightbulb</span>
                  Correct Option: <span className="text-emerald-500 text-sm font-extrabold">{hintsUsed[q.id].correct_answer}</span>
                </div>
                {user?.account_type === 'Pro' ? (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800/50 leading-relaxed font-medium">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-1">Step-by-step Solution:</span>
                    {hintsUsed[q.id].explanation || 'Detailed solution is available.'}
                  </div>
                ) : (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                    💡 Upgrade to Pro to unlock step-by-step solutions
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-[#0a0f1e] border-t border-slate-200 dark:border-slate-800/80 p-5 flex flex-wrap justify-between items-center gap-3 flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer">
              Previous
            </button>

            <button
              onClick={() => toggleReviewFlag(q.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                reviewFlags[q.id]
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                  : 'border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              {reviewFlags[q.id] ? '★ Flagged for Review' : '☆ Mark for Review'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => useHint(q.id)} disabled={!!hintsUsed[q.id] || (user?.account_type === 'Free' && hintsRemaining <= 0)}
              className="px-5 py-2.5 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/5 font-black text-xs disabled:opacity-40 transition-colors cursor-pointer">
              {hintsUsed[q.id] ? 'Hint Used' : `Use Hint (${user?.account_type === 'Free' ? `${hintsRemaining} Left` : 'Pro Unlimited'})`}
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all">
                Next
              </button>
            ) : (
              <button onClick={() => setConfirmSubmit(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer active:scale-95 transition-all shadow-md shadow-emerald-500/10">
                Submit Exam
              </button>
            )}
          </div>
        </footer>
      </main>

      {/* Submit Confirmation Modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0d1425] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl mx-4">
            <h3 className="font-black text-xl text-slate-900 dark:text-white mb-2">Finish and Submit?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              You have answered {Object.keys(answers).length} of {questions.length} questions. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} disabled={loadingSubmit}
                className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white text-xs cursor-pointer hover:bg-slate-200">
                Back
              </button>
              <button onClick={handleSubmit} disabled={loadingSubmit}
                className="flex-1 py-3 rounded-xl font-black bg-emerald-600 text-white text-xs cursor-pointer active:scale-95 transition-all hover:bg-emerald-700">
                {loadingSubmit ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
