import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../app/store/authStore';
import Header from '../../components/common/Header';

export default function AnalyticsPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/analytics').then((r) => r.data)
      .then((d) => {
        setData(d.success ? d.analytics : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Performance Analytics"
        subtitle="Detailed analysis of your scores, topic accuracies, and personalized studies."
      />

      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        {loading ? (
          <div className="text-slate-500 font-bold animate-pulse text-xs">Computing performance statistics...</div>
        ) : !data || data.totalAttempts === 0 ? (
          <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-10 rounded-2xl text-center text-xs shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-3 block text-slate-400">query_stats</span>
            No performance analytics data available.
            <p className="font-normal text-slate-400 mt-2">Submit at least one quiz to view performance charts and recommendations.</p>
          </div>
        ) : (
          <>
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined text-blue-500 text-2xl">menu_book</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.totalAttempts}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quizzes Taken
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined text-emerald-500 text-2xl">percent</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.averagePercentage}%
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Average Accuracy
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined text-emerald-500 text-2xl">task_alt</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.totalCorrect}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Correct Solved
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                <span className="material-symbols-outlined text-red-500 text-2xl">quiz</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.totalQuestions}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Questions
                </div>
              </div>
            </div>

            {/* Topics Performance List */}
            <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6">
                Topic Performance Analysis
              </h3>
              
              <div className="space-y-6">
                {data.topicsPerformance.map((topicStat: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {topicStat.topic}
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400">
                        {topicStat.accuracy}% Accuracy ({topicStat.quizzesCount} taken)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          topicStat.accuracy >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${topicStat.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations & Strengths/Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Target Focus (Weaknesses) */}
              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  High Priority Review Topics
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {data.topicsPerformance.filter((t: any) => t.accuracy < 70).length === 0 ? (
                    <p className="text-slate-400">Awesome job! You have achieved high accuracy across all practiced chapters.</p>
                  ) : (
                    <>
                      <p>Consider re-taking tests on these chapters to reinforce correct methods:</p>
                      <ul className="list-disc pl-5 space-y-1.5 text-slate-800 dark:text-slate-200">
                        {data.topicsPerformance
                          .filter((t: any) => t.accuracy < 70)
                          .map((t: any, i: number) => (
                            <li key={i} className="font-extrabold">{t.topic} ({t.accuracy}% accuracy)</li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Strengths & Accolades */}
              <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Mastered Subjects
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {data.topicsPerformance.filter((t: any) => t.accuracy >= 70).length === 0 ? (
                    <p className="text-slate-400">Keep solving quizzes! Accumulating scores above 70% will list them here.</p>
                  ) : (
                    <>
                      <p>You have demonstrated strong performance in these chapters:</p>
                      <ul className="list-disc pl-5 space-y-1.5 text-slate-800 dark:text-slate-200">
                        {data.topicsPerformance
                          .filter((t: any) => t.accuracy >= 70)
                          .map((t: any, i: number) => (
                            <li key={i} className="font-extrabold">{t.topic} ({t.accuracy}% accuracy)</li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
