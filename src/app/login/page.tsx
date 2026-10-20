'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // Simulate authentication
    setTimeout(() => {
      try {
        localStorage.setItem(
          'linkpulse_user',
          JSON.stringify({
            email: email.trim(),
            name: email.split('@')[0],
            loggedInAt: new Date().toISOString()
          })
        );
      } catch {}
      router.push('/');
    }, 700);
  };

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        localStorage.setItem(
          'linkpulse_user',
          JSON.stringify({
            email: `user@${provider.toLowerCase()}.com`,
            name: `${provider} User`,
            loggedInAt: new Date().toISOString()
          })
        );
      } catch {}
      router.push('/');
    }, 500);
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
        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-100/90 dark:border-slate-700/80 flex items-center justify-center mx-auto mb-4.5">
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
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5">
            Sign in with email
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[270px] mx-auto">
            Make a new doc to bring your words, data, and teams together. For free
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {message && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-center font-medium">
              {message}
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
          <div className="flex justify-end pt-0.5 pb-1">
            <button
              type="button"
              onClick={() => setMessage('Password reset instructions sent to your email.')}
              className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium transition cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Get Started Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-[#18181b] hover:bg-[#09090b] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Get Started'
            )}
          </button>
        </form>

        {/* Dotted Divider */}
        <div className="flex items-center my-4.5">
          <div className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 px-3 select-none">
            Or sign in with
          </span>
          <div className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
        </div>

        {/* Social Authentication Row */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleSocialLogin('Google')}
            className="h-10 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 shadow-2xs flex items-center justify-center transition-all hover:shadow-xs active:scale-95 cursor-pointer"
            aria-label="Sign in with Google"
            title="Google"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleSocialLogin('Facebook')}
            className="h-10 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 shadow-2xs flex items-center justify-center transition-all hover:shadow-xs active:scale-95 cursor-pointer"
            aria-label="Sign in with Facebook"
            title="Facebook"
          >
            <svg className="w-4 h-4 text-[#1877F2] fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleSocialLogin('Apple')}
            className="h-10 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 shadow-2xs flex items-center justify-center transition-all hover:shadow-xs active:scale-95 cursor-pointer"
            aria-label="Sign in with Apple"
            title="Apple"
          >
            <svg className="w-4 h-4 text-black dark:text-white fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.36-.57.66-1.07 1.72-.94 2.76 1 .08 2.04-.51 2.66-1.27z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
