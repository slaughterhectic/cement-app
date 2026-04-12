import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import { Eye, EyeOff, Package, X } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user, permissions } = await api.auth.login(username.trim(), password);
      setAuth(token, user, permissions);
      navigate(user.role === 'admin' ? '/dashboard' : '/purchases');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/20 ring-2 ring-brand-400/30">
            <Package className="h-10 w-10 text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">CementBook</h1>
          <p className="mt-4 text-lg text-slate-300">
            Your complete cement dealership management platform.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {['Track sales & purchases', 'Manage parties & dealers', 'Monitor stock & payments'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-slate-300">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/20 ring-2 ring-brand-400/30">
              <Package className="h-7 w-7 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">CementBook</h1>
          </div>

          <div className="rounded-2xl bg-white/5 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400" role="alert">
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-slate-400 hover:text-brand-400 transition underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Forgot Password</h3>
                <p className="mt-1 text-sm text-slate-400">Password reset assistance</p>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
              Please contact your administrator to reset your password. They can update it from the User Management settings.
            </div>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="mt-4 w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
