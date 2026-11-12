import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../app/store/authStore';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const navItem = (to: string, icon: string, label: string) => {
    const active = pathname === to;
    return (
      <button
        onClick={() => navigate(to)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all text-left ${
          active ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span className="material-symbols-outlined text-lg">{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 transition-colors duration-300 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center border-2 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]">
          <span className="font-black text-xl text-white material-symbols-outlined text-[22px]">admin_panel_settings</span>
        </div>
        <div>
          <div className="font-black text-white text-lg tracking-tight">COMMAND</div>
          <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Admin Center</div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 mx-4 my-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div className="font-bold text-sm text-white mb-1 truncate">{user.username}</div>
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 uppercase border border-red-500/30">
          Super Admin
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
        {navItem('/admin', 'query_stats', 'Platform Stats')}
        {navItem('/admin/upload', 'upload_file', 'Data Ingestion')}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 space-y-1.5">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-bold text-left"
        >
          <span className="material-symbols-outlined text-lg">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          {theme === 'dark' ? 'Force Light' : 'Force Dark'}
        </button>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-bold text-left"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Terminate Session
        </button>
      </div>
    </aside>
  );
}
