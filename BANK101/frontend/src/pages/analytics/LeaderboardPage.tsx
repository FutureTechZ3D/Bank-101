import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../app/store/authStore';
import Header from '../../components/common/Header';

export default function LeaderboardPage() {
  const { token, user } = useAuthStore();
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api('/leaderboard').then((r) => r.data)
      .then((d) => {
        setBoard(d.success && Array.isArray(d.leaderboard) ? d.leaderboard : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030814] transition-colors duration-300">
      <Header
        title="Leaderboard Standings"
        subtitle="Compete with other banking aspirants and claim your spot on the top."
      />

      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-slate-500 font-bold animate-pulse text-xs">Connecting to Leaderboard Node...</div>
        ) : (
          <div className="bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md">
            
            {/* Header Table */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
              <span className="font-black text-xs text-slate-800 dark:text-slate-200">Global Rankings</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top 10 aspirants</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {board.map((item, idx) => {
                const isMe = user?.username === item.username;
                const rank = idx + 1;
                
                let rankBadge = '';
                if (rank === 1) rankBadge = '🥇';
                else if (rank === 2) rankBadge = '🥈';
                else if (rank === 3) rankBadge = '🥉';

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-5 transition-colors ${
                      isMe
                        ? 'bg-blue-50/40 dark:bg-blue-600/5 border-l-4 border-blue-500 pl-4'
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Index */}
                      <span className="w-8 font-black text-sm text-slate-400 dark:text-slate-500 flex items-center justify-center">
                        {rankBadge || `#${rank}`}
                      </span>

                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.username}
                          </span>
                          {isMe && (
                            <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase border border-blue-200 dark:border-blue-800/40">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          Account: {item.account_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      {/* Streak */}
                      <div>
                        <div className="text-xs font-bold text-amber-500 flex items-center justify-end gap-0.5">
                          <span className="material-symbols-outlined text-[14px] font-fill">local_fire_department</span>
                          {item.streak_days || 0}d
                        </div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          Streak
                        </div>
                      </div>

                      {/* Points */}
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {item.points}
                        </div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          Score Points
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
