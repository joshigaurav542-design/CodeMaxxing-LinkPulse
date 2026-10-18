'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface PasswordGateProps {
  shortCode: string;
  title?: string;
}

export default function PasswordGate({ shortCode, title }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Incorrect password.');
        setIsLoading(false);
        return;
      }

      // Successful unlock - navigate to target URL
      window.location.href = data.targetUrl;
    } catch {
      setError('Connection failed. Please retry.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl" />

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 text-indigo-400">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Password Gate
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            {title || 'Protected Link'}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Access to <span className="font-mono text-indigo-300 font-semibold">/{shortCode}</span> is encrypted. Enter the authorized password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-center tracking-widest text-lg"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Unlock & Proceed
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-xs text-slate-500 flex items-center justify-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-slate-400">LinkPulse Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
