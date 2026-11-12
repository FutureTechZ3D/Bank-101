import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../../app/store/authStore';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;

export default function LoginPage() {
  const { login, register, googleLogin, authError, isLoading } = useAuthStore();

  // Signup fields
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suPhone, setSuPhone] = useState('');

  // Login fields
  const [lgUsername, setLgUsername] = useState('');
  const [lgPassword, setLgPassword] = useState('');
  const [lgRemember, setLgRemember] = useState(true);

  // Each form shows its own message. The server's message is used as returned (not a stale store value).
  const [suError, setSuError] = useState<string | null>(null);
  const [lgError, setLgError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError(null);
    if (!USERNAME_RE.test(suUsername)) {
      setSuError('Username must be 3-50 characters: letters, digits, _ . -');
      return;
    }
    if (suPassword.length < 8 || suPassword.length > 72) {
      setSuError('Password must be 8-72 characters');
      return;
    }
    const r = await register(suUsername, suPassword, suPhone.trim() || undefined, true);
    if (!r.ok) setSuError(r.message || 'Registration failed');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLgError(null);
    if (!lgUsername || !lgPassword) {
      setLgError('Login requires both username and password');
      return;
    }
    const r = await login(lgUsername, lgPassword, lgRemember);
    if (!r.ok) setLgError(r.message || 'Login failed');
  };

  // Real Google credential (ID token) from the Google button; the server verifies it.
  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setLgError(null);
      setSuError(null);
      const r = await googleLogin(idToken);
      if (!r.ok) setLgError(r.message || 'Google sign-in failed');
    },
    [googleLogin]
  );

  return (
    <div className="min-h-screen relative flex flex-col md:flex-row bg-[#020617] overflow-y-auto">
      
      {/* Background ambient layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="immersive-glow-blue" />
        <div className="immersive-glow-gold" />
      </div>

      {/* Center Top Brand Header */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none select-none">
        <div className="bg-[#0f172a]/90 backdrop-blur-md px-6 py-2.5 rounded-full flex items-center gap-3 border border-slate-800 pointer-events-auto shadow-lg shadow-black/40">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-white font-fill text-[20px]">account_balance</span>
          </div>
          <span className="font-extrabold text-lg text-slate-100 tracking-tight">BANK-101</span>
        </div>
      </div>

      {/* Main split sections */}
      <main className="flex-1 flex flex-col md:flex-row w-full z-10 pt-20 md:pt-0">
        
        {/* Left Side: SIGN UP PANEL */}
        <section className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 min-h-[500px] md:min-h-screen border-b md:border-b-0 md:border-r border-slate-800/40">
          <div className="w-full max-w-md auth-glass p-8 md:p-10 rounded-2xl shadow-2xl relative overflow-hidden">
            
            {/* Ambient gold line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-amber-500" />
            
            <header className="mb-6 text-center">
              <h1 className="text-xl md:text-2xl font-black text-slate-100 mb-1.5 tracking-tight">Create your account</h1>
              <p className="text-xs text-slate-400 font-medium">Start your executive banking journey today</p>
            </header>

            {suError && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-semibold">
                {suError}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">person</span>
                  <input
                    type="text"
                    required
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-900/40 transition-all placeholder:text-slate-600"
                    placeholder="e.g. jdoe_executive"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Phone Number (Optional)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">call</span>
                  <input
                    type="tel"
                    value={suPhone}
                    onChange={(e) => setSuPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-900/40 transition-all placeholder:text-slate-600"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">lock</span>
                  <input
                    type="password"
                    required
                    value={suPassword}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    onChange={(e) => setSuPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-900/40 transition-all placeholder:text-slate-600"
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl btn-shadow transition-all flex items-center justify-center gap-1.5 mt-6 cursor-pointer"
              >
                {isLoading ? 'Processing...' : 'Sign Up'}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              <div className="relative py-2.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/80"></div></div>
                <span className="relative bg-[#171f30] px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Or continue with</span>
              </div>

              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} />
            </form>
          </div>
        </section>

        {/* Right Side: LOGIN PANEL */}
        <section className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 min-h-[500px] md:min-h-screen bg-slate-950/20">
          <div className="w-full max-w-md p-8 md:p-10 rounded-2xl border border-slate-900 bg-slate-900/30 relative">
            
            {/* Elegant side bar indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-600 rounded-r-2xl" />

            <header className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
                <span className="material-symbols-outlined text-[22px] font-fill">verified_user</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 mb-1.5 tracking-tight">Welcome Back</h2>
              <p className="text-xs text-slate-400 font-medium">Sign in to your learning dashboard</p>
            </header>

            {(lgError || authError) && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-semibold">
                {lgError || authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">person</span>
                  <input
                    type="text"
                    required
                    value={lgUsername}
                    onChange={(e) => setLgUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                    placeholder="Your username"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <span className="text-xs text-slate-500" title="There is no self-service reset yet">Forgot? Ask an administrator</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">lock</span>
                  <input
                    type="password"
                    required
                    value={lgPassword}
                    onChange={(e) => setLgPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input
                  type="checkbox"
                  id="remember"
                  checked={lgRemember}
                  onChange={(e) => setLgRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/35"
                />
                <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer">Remember this device</label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.99] text-slate-950 font-bold text-xs py-3 rounded-xl btn-shadow transition-all flex items-center justify-center gap-1.5 mt-6 cursor-pointer"
              >
                {isLoading ? 'Processing...' : 'Login'}
                <span className="material-symbols-outlined text-[16px] font-bold text-slate-950">login</span>
              </button>

              <div className="relative py-2.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800/80"></div></div>
                <span className="relative bg-[#10192a] px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Security Partner Sign-in</span>
              </div>

              <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} />
            </form>
          </div>
        </section>
      </main>

      {/* Footer Meta */}
      <footer className="fixed bottom-4 left-6 hidden md:block select-none pointer-events-none">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">© 2026 BANK-101 Institute. All rights reserved.</p>
      </footer>
    </div>
  );
}
