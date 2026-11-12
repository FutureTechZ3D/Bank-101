import { useNavigate } from 'react-router-dom';
import { useResultsStore } from '../../app/store/resultsStore';
import Header from '../../components/common/Header';

export default function ResultPage() {
  const navigate = useNavigate();
  const { examResults, reviewItems } = useResultsStore();

  if (!examResults) {
    return (
      <div className="flex-1 p-10 text-slate-500 dark:text-slate-400 font-bold">
        No results found.{' '}
        <button onClick={() => navigate('/dashboard')} className="text-blue-500 underline">Return to Dashboard</button>
      </div>
    );
  }

  const pass = examResults.percentage >= 40;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header title="Exam Report Card" subtitle="Review your performance metrics and answer keys." />

      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">

        {/* Score Summary */}
        <section className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-[2rem]" />

          {/* Percentage circle */}
          <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="60" strokeWidth="12" stroke="currentColor" className="text-slate-100 dark:text-slate-800" fill="transparent" />
              <circle cx="72" cy="72" r="60" strokeWidth="12"
                strokeDasharray={376.8}
                strokeDashoffset={376.8 - (376.8 * Math.round(examResults.percentage)) / 100}
                strokeLinecap="round" stroke="currentColor"
                className={pass ? 'text-emerald-500' : 'text-red-500'} fill="transparent" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{Math.round(examResults.percentage)}%</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{pass ? 'PASSED' : 'FAILED'}</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pass ? 'Congratulations!' : 'Keep Practicing'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              You scored <span className="font-bold text-slate-800 dark:text-white">{examResults.correct}</span> out of{' '}
              <span className="font-bold text-slate-800 dark:text-white">{examResults.total}</span> questions.
            </p>
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all">
              Return to Dashboard
            </button>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Score Ratio', value: `${examResults.correct} / ${examResults.total}`, color: 'text-slate-900 dark:text-white' },
            { label: 'Correct Answers', value: examResults.correct, color: 'text-emerald-500' },
            { label: 'Wrong Answers', value: examResults.wrong, color: 'text-red-500' },
            { label: 'Unanswered', value: examResults.unanswered, color: 'text-slate-400 dark:text-slate-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#0a0f1e]/85 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm text-center">
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Answer Review */}
        {reviewItems.length > 0 && (
          <section className="space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Review Questions & Solutions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verify choices and view detailed explanations.</p>
            </div>
            <div className="space-y-6">
              {reviewItems.map((item, idx) => {
                const wasCorrect = item.selected_option === item.correct_answer;
                return (
                  <div key={item.id} className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 font-extrabold text-[10px] border border-slate-200/50 dark:border-slate-800">
                        Q. {idx + 1}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${wasCorrect ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {wasCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">{item.question}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {Object.keys(item.options).sort().map((opt) => {
                        const text = (item.options as any)[opt];
                        if (!text) return null;
                        const isSelected = item.selected_option === opt;
                        const isCorrect = item.correct_answer === opt;
                        let border = 'border-slate-200 dark:border-slate-800';
                        let badge = 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400';
                        if (isCorrect) { border = 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10'; badge = 'bg-emerald-500 text-white font-extrabold'; }
                        else if (isSelected) { border = 'border-red-500 bg-red-50/10 dark:bg-red-950/10'; badge = 'bg-red-500 text-white font-extrabold'; }
                        return (
                          <div key={opt} className={`flex items-center p-3.5 rounded-xl border text-xs leading-relaxed ${border}`}>
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] mr-3 font-bold ${badge}`}>{opt}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{text}</span>
                          </div>
                        );
                      })}
                    </div>
                    {item.explanation && (
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        <span className="font-black text-blue-600 dark:text-blue-400 block mb-1">Explanation:</span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
