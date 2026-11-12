import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { TIER_TOGGLE_ENABLED } from '../../lib/api';
import { useAuthStore } from '../../app/store/authStore';

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateAccountType } = useAuthStore();
  const [tierMsg, setTierMsg] = useState<string | null>(null);

  if (!user) return null;

  const navItem = (to: string, icon: string, label: string) => {
    const active = pathname === to || pathname.startsWith(to + '/');
    return (
      <button
        onClick={() => navigate(to)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all text-left ${
          active
            ? 'bg-blue-50 dark:bg-blue-600/25 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-500 pl-3'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <span className="material-symbols-outlined text-lg">{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#0a0f1e] border-r border-slate-200 dark:border-slate-800/60 flex flex-col h-screen sticky top-0 transition-colors duration-300 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center border-2 border-amber-400 shadow-lg shadow-blue-500/10">
          <span className="font-black text-xl text-white">B</span>
        </div>
        <div>
          <div className="font-black text-slate-900 dark:text-white text-lg tracking-tight">BANK-101</div>
          <div className="text-[10px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider">Education Portal</div>
        </div>
      </div>

      {/* User Status Card */}
      <div className="p-4 mx-4 my-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div className="font-bold text-base text-slate-900 dark:text-white mb-1 truncate">{user.username}</div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${
            user.account_type === 'Pro'
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
          }`}>
            {user.account_type === 'Pro' ? '⭐ PRO' : '🎯 FREE'}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            🔥 {user.streak_days || 0}d streak
          </span>
        </div>

        {TIER_TOGGLE_ENABLED && (user.account_type === 'Free' || user.account_type === 'Pro') && (
          <div className="mt-3">
            <button
              onClick={async () => {
                const r = await updateAccountType(user.account_type === 'Pro' ? 'Free' : 'Pro');
                setTierMsg(r.ok ? null : r.message || 'Could not switch');
              }}
              className="w-full text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg border border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 cursor-pointer"
              title="Testing only: needs ENABLE_TIER_TOGGLE=true on the backend"
            >
              Test: switch to {user.account_type === 'Pro' ? 'Free' : 'Pro'}
            </button>
            {tierMsg && <div role="alert" className="mt-1 text-[10px] text-red-500 font-semibold">{tierMsg}</div>}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">Rank Points</span>
          <span className="font-black text-blue-600 dark:text-blue-400">{user.points || 0} pts</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItem('/dashboard', 'dashboard', 'Dashboard')}
        {navItem('/directory', 'account_balance', 'Exam Directory')}
        {navItem('/compare', 'compare_arrows', 'Compare Exams')}
        {navItem('/library', 'local_library', 'Digital Library')}
        {navItem('/pyq', 'history_edu', 'PYQ Papers')}
        {navItem('/ai-tutor', 'smart_toy', 'Grounded AI Tutor')}
        {navItem('/performance-lab', 'insights', 'Performance Lab')}
        {navItem('/institutions', 'domain', 'Academies & Batches')}
        {navItem('/privacy', 'shield', 'Privacy & DPDP')}
        {navItem('/leaderboard', 'workspace_premium', 'Leaderboard')}
        {navItem('/analytics', 'analytics', 'Performance')}
        {navItem('/certificates', 'card_membership', 'Certificates')}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 space-y-1.5">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all font-bold text-left"
        >
          <span className="material-symbols-outlined text-lg">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          {theme === 'dark' ? 'Light Theme' : 'Premium Dark'}
        </button>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-left"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
