'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Link2,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Clock,
  Gauge,
  Smartphone,
  Sparkles,
  Layers,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Campaign, Link } from '@/lib/types';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  onLinkCreated: (link: Link) => void;
}

export default function CreateLinkModal({ isOpen, onClose, campaigns, onLinkCreated }: CreateLinkModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [title, setTitle] = useState('');

  // Alias Validation State
  const [aliasChecking, setAliasChecking] = useState(false);
  const [aliasStatus, setAliasStatus] = useState<{ available?: boolean; message?: string } | null>(null);

  // Step 2 State (Rules & Routing)
  const [campaignId, setCampaignId] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [enableClickLimit, setEnableClickLimit] = useState(false);
  const [clickLimit, setClickLimit] = useState('100');
  const [enableDeviceRouting, setEnableDeviceRouting] = useState(false);
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [desktopUrl, setDesktopUrl] = useState('');

  // Submission & Warning State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prePublishWarnings, setPrePublishWarnings] = useState<string[]>([]);

  // Debounced alias availability check
  useEffect(() => {
    if (!customAlias.trim()) {
      setAliasStatus(null);
      setAliasChecking(false);
      return;
    }

    const timer = setTimeout(async () => {
      setAliasChecking(true);
      try {
        const res = await fetch(`/api/links/check-alias?alias=${encodeURIComponent(customAlias.trim())}`);
        const data = await res.json();
        setAliasStatus({
          available: data.available,
          message: data.message || data.reason
        });
      } catch {
        setAliasStatus({ available: false, message: 'Could not verify alias.' });
      } finally {
        setAliasChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customAlias]);

  // Pre-publish warning generator
  useEffect(() => {
    const warnings: string[] = [];
    if (destinationUrl.startsWith('http://')) {
      warnings.push('Insecure Protocol: Destination uses unencrypted http:// instead of https://.');
    }
    if (destinationUrl.includes('bit.ly') || destinationUrl.includes('tinyurl.com')) {
      warnings.push('Chained Redirect Notice: Destination is another URL shortener, which may cause latency spikes.');
    }
    setPrePublishWarnings(warnings);
  }, [destinationUrl]);

  if (!isOpen) return null;

  const handleStep1Next = () => {
    if (!destinationUrl.trim()) {
      setErrorMsg('Destination URL is required.');
      return;
    }
    try {
      const parsed = new URL(destinationUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setErrorMsg('Only http:// and https:// URLs are supported.');
        return;
      }
    } catch {
      setErrorMsg('Please enter a valid URL starting with https://');
      return;
    }

    if (customAlias && aliasStatus && !aliasStatus.available) {
      setErrorMsg('Please choose an available custom alias or leave blank to auto-generate.');
      return;
    }

    setErrorMsg(null);
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        destinationUrl: destinationUrl.trim(),
        customAlias: customAlias.trim() || undefined,
        title: title.trim() || undefined,
        campaignId: campaignId || undefined
      };

      if (enablePassword && password.trim()) {
        payload.password = password.trim();
      }
      if (enableExpiry && expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString();
      }
      if (enableClickLimit && clickLimit) {
        payload.clickLimit = parseInt(clickLimit, 10);
      }
      if (enableDeviceRouting) {
        payload.deviceRules = {
          ios: iosUrl.trim() || undefined,
          android: androidUrl.trim() || undefined,
          desktop: desktopUrl.trim() || undefined
        };
      }

      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to create link.');
        setIsSubmitting(false);
        return;
      }

      // Celebrate with confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      onLinkCreated(data.link);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative text-white">
        {/* Wizard Header & Stepper */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Two-Step Link Creation Wizard</h2>
              <p className="text-xs text-slate-400">Step {step} of 2: {step === 1 ? 'Target & Alias Identity' : 'Rules, Expiry & Device Routing'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div className={`h-1 bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* ================= STEP 1: DESTINATION & ALIAS ================= */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Destination URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/very/long/landing-page"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Checked against WHATWG standard & OWASP open-redirect policies.</p>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Link Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Black Friday Special Promo Banner"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Custom Alias Input with Live Availability Check */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Custom Back-Half / Alias
                  </label>
                  {aliasChecking && (
                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                    </span>
                  )}
                  {aliasStatus && !aliasChecking && (
                    <span className={`text-xs flex items-center gap-1 font-medium ${aliasStatus.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {aliasStatus.available ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                      {aliasStatus.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50">
                  <span className="px-3.5 py-3 text-xs font-mono text-slate-400 bg-slate-900/60 border-r border-slate-800 select-none">
                    linkpulse.io/
                  </span>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    placeholder="my-custom-name (leave empty for Base62 code)"
                    className="w-full px-3 py-3 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Pre-Publish Warnings */}
              {prePublishWarnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="w-4 h-4" /> Pre-Publish Advisory
                  </div>
                  {prePublishWarnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-300/80 pl-5">{w}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ================= STEP 2: RULES, EXPIRY & ROUTING ================= */
            <div className="space-y-5">
              {/* Campaign Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Assign to Campaign
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                >
                  <option value="">No Campaign (Default Workspace)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Protection Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Password Gate</h4>
                      <p className="text-[11px] text-slate-400">Require credentials before executing redirect</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
                {enablePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access password..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                )}
              </div>

              {/* Scheduled Expiry Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Expiration Timestamp</h4>
                      <p className="text-[11px] text-slate-400">Auto-disable link after promotion ends (RFC 410 Gone)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableExpiry}
                    onChange={(e) => setEnableExpiry(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
                {enableExpiry && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                )}
              </div>

              {/* Click-Cap Counter Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Click-Cap Limit</h4>
                      <p className="text-[11px] text-slate-400">Atomic limit (e.g. first 500 visitors only)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableClickLimit}
                    onChange={(e) => setEnableClickLimit(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
                {enableClickLimit && (
                  <input
                    type="number"
                    min="1"
                    value={clickLimit}
                    onChange={(e) => setClickLimit(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                )}
              </div>

              {/* Device Targeting Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">Device-Specific Smart Routing</h4>
                      <p className="text-[11px] text-slate-400">Route iOS, Android, and Desktop users to custom destinations</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableDeviceRouting}
                    onChange={(e) => setEnableDeviceRouting(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
                {enableDeviceRouting && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">iOS App Store URL:</label>
                      <input
                        type="url"
                        value={iosUrl}
                        onChange={(e) => setIosUrl(e.target.value)}
                        placeholder="https://apps.apple.com/..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Android Google Play URL:</label>
                      <input
                        type="url"
                        value={androidUrl}
                        onChange={(e) => setAndroidUrl(e.target.value)}
                        placeholder="https://play.google.com/store/..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Desktop Landing URL:</label>
                      <input
                        type="url"
                        value={desktopUrl}
                        onChange={(e) => setDesktopUrl(e.target.value)}
                        placeholder="https://github.com/desktop..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Step 1
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleStep1Next}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer"
            >
              Configure Rules & Expiry
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Create & Warm Cache
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
