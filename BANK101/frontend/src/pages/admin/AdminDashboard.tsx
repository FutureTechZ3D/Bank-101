import { useEffect, useState } from 'react';
import { api, errorText } from '../../lib/api';
import { useAuthStore } from '../../app/store/authStore';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    api('/admin/stats').then((r) => {
      if (r.ok && typeof r.data.totalUsers === 'number') {
        setStats(r.data);
        setLoadError(null);
      } else {
        setLoadError(errorText(r, 'Could not load the platform numbers.'));
      }
    });
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-10 text-white transition-colors duration-300">
      {loadError && (
        <div role="alert" className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
          {loadError}
        </div>
      )}
      <header className="mb-10">
        <h1 className="font-black text-3xl text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500 text-4xl">monitoring</span>
          Platform Telemetry
        </h1>
        <p className="text-slate-400 mt-2">Real-time statistics from the mock datastore.</p>
      </header>

      {!stats ? (
        <div className="text-slate-500 font-bold animate-pulse text-sm">
          Establishing connection...
        </div>
      ) : (
        <div className="space-y-10">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon="group"
              label="Total Users"
              value={stats.totalUsers}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              icon="quiz"
              label="Total Quizzes"
              value={stats.totalQuizzes}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
            <StatCard
              icon="help"
              label="Total Questions"
              value={stats.totalQuestions}
              color="text-emerald-400"
              bg="bg-emerald-500/10"
            />
            <StatCard
              icon="done_all"
              label="Total Attempts"
              value={stats.totalAttempts}
              color="text-purple-400"
              bg="bg-purple-500/10"
            />
          </div>

          {/* Recent registrations table */}
          {stats.recentUsers && stats.recentUsers.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-xl">recent_actors</span>
                Recent Identifiers
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 uppercase tracking-wider font-bold">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Starting Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {stats.recentUsers.map((u: any) => (
                      <tr key={u.id} className="text-slate-300">
                        <td className="py-4 text-slate-500">#{u.id}</td>
                        <td className="py-4 font-bold text-white">{u.username}</td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              u.account_type === 'Admin'
                                ? 'bg-red-500/20 text-red-400'
                                : u.account_type === 'Pro'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {u.account_type}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400">{u.points || 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
      <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black text-white mb-0.5">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
