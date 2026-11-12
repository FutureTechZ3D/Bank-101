import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../app/store/authStore';
import { useNavStore } from '../../app/store/navStore';
import { HIERARCHY_DATA } from '../../data';
import Header from '../../components/common/Header';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setSelectedCategory } = useNavStore();

  const handleSelectCategory = (exam: any) => {
    setSelectedCategory(exam);
    navigate('/exams');
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header title="Learning Dashboard" subtitle="Welcome back, ready to master your exams?" />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">

        {/* Welcome Hero Banner */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-800 p-8 md:p-12 text-white shadow-xl shadow-blue-500/5">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/20 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Welcome back, {user.username}!
            </h2>
            <p className="text-sm md:text-lg text-blue-100/90 font-medium">
              Ready to conquer your next certification? Your current study streak is{' '}
              <span className="font-extrabold text-amber-400">{user.streak_days || 0} days</span>. Keep the
              momentum going, complete quizzes, and unlock your next professional badge.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/leaderboard')}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                View Leaderboard
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="px-6 py-2.5 border border-white/20 hover:bg-white/10 active:scale-[0.98] text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Track Progress
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'local_fire_department', color: 'text-amber-500', value: `${user.streak_days || 0} Days`, label: 'Study Streak' },
            { icon: 'military_tech', color: 'text-blue-500', value: `${user.points || 0} pts`, label: 'Total Points' },
            { icon: 'verified', color: 'text-emerald-500', value: user.account_type, label: 'Account Tier' },
            { icon: 'school', color: 'text-purple-500', value: `${HIERARCHY_DATA.exams.length} Categories`, label: 'Curated Domains' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-[#0a0f1e]/80 border border-slate-200/50 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm">
              <span className={`material-symbols-outlined text-3xl font-fill ${stat.color}`}>{stat.icon}</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Exam Categories */}
        <section className="space-y-6">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Exam Categories</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Select a specialized category path to launch practice test modules.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HIERARCHY_DATA.exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => handleSelectCategory(exam)}
                className="group relative flex flex-col items-start text-left bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/70 p-6 md:p-8 rounded-[1.5rem] hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500/50 transition-all duration-300 cursor-pointer shadow-sm"
              >
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-800/80 group-hover:scale-110 transition-transform duration-300 font-bold text-2xl">
                  {exam.icon}
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {exam.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                  Professional modules for {exam.sub}. Full syllabus coverage, mock tests, and practice rooms.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60 w-full flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 dark:border-slate-800/80">
                    {exam.types.length} exam paths
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    Start <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Masterclass */}
        <section className="bg-white dark:bg-[#0a0f1e]/80 p-6 md:p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white p-4 text-center">
            <div>
              <span className="material-symbols-outlined text-4xl mb-1">school</span>
              <div className="font-extrabold text-sm uppercase">Class Master</div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-500/30">
              FEATURED RECOMMENDATION
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">Executive Banking Masterclass</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Unlock a 12-week comprehensive bootcamp geared towards RBI Grade B and SBI PO candidates.
            </p>
            <div className="pt-2">
              <button
                onClick={() => alert('Masterclass details coming soon!')}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black rounded-lg text-xs cursor-pointer active:scale-95 transition-all"
              >
                Enroll Now
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
