'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email: email.trim(),
          password,
          name: mode === 'register' ? name.trim() : undefined
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(mode === 'register' ? 'Account created! Redirecting...' : 'Signed in! Redirecting...');

      // Store authenticated user in localStorage
      try {
        localStorage.setItem('linkpulse_user', JSON.stringify(data.user));
      } catch {}

      setTimeout(() => {
        router.push('/');
      }, 600);
    } catch {
      setErrorMsg('Network error. Unable to reach authentication server.');
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPw: string) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPw);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4 bg-cover bg-center overflow-hidden font-sans select-none"
      style={{
        backgroundImage: "url('/sky-bg.jpg')",
        backgroundColor: '#bfdbfe'
      }}
    >
      {/* Soft gradient wash overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-sky-200/10 to-white/30 backdrop-blur-[0.5px] pointer-events-none" />

      {/* Faint concentric geometric arc lines matching design */}
      <div className="absolute w-[620px] h-[620px] rounded-full border border-white/40 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
      <div className="absolute w-[840px] h-[840px] rounded-full border border-white/25 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />
      <div className="absolute w-[1060px] h-[1060px] rounded-full border border-white/15 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2" />

      {/* Top Left Branding */}
      <header className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Zap className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 drop-shadow-xs">
            LinkPulse
          </span>
        </Link>
      </header>

      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2.5">
        <ThemeToggle />
        <Link
          href="/"
          className="px-3.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-800 text-xs font-semibold backdrop-blur-md border border-white/90 shadow-2xs transition-all"
        >
          Dashboard
        </Link>
      </div>

      {/* Floating Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[390px] bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 rounded-[32px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-all">
        {/* Top Floating Action Badge (Arrow-in-Door Icon) */}
        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-100/90 dark:border-slate-700/80 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-4.5 h-4.5 text-slate-900 dark:text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 4h4v16h-4" />
            <path d="M4 12h10" />
            <path d="M10 8l4 4-4 4" />
          </svg>
        </div>

        {/* Heading & Subtitle */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
            {mode === 'login' ? 'Sign in with email' : 'Create an account'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[270px] mx-auto">
            {mode === 'login'
              ? 'Access your links, telemetry, and team workspace.'
              : 'Sign up to create custom short links and track live analytics.'}
          </p>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl mb-4 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name Input (Register Only) */}
          {mode === 'register' && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-slate-400/30 focus-within:border-transparent transition-all">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="bg-transparent text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none w-full font-sans"
              />
            </div>
          )}

          {/* Email Input */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-slate-400/30 focus-within:border-transparent transition-all">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-transparent text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none w-full font-sans"
              required
            />
          </div>

          {/* Password Input */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-slate-400/30 focus-within:border-transparent transition-all">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-transparent text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:outline-none w-full font-sans"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Forgot Password */}
          {mode === 'login' && (
            <div className="flex justify-end pt-0.5 pb-1">
              <button
                type="button"
                onClick={() => setErrorMsg('To reset your password, contact your database administrator.')}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium transition cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-[#18181b] hover:bg-[#09090b] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Fill */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>SQLite Database Auth (scrypt hashed)</span>
          </div>
          <button
            type="button"
            onClick={() => handleFillDemo('gaurav.joshi@gehu.ac.in', 'linkpulse2026')}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
          >
            Fill Demo Admin Credentials (1-click)
          </button>
        </div>
      </div>
    </div>
  );
}
