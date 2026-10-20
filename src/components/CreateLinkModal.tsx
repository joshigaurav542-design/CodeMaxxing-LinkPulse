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
    }, 350);

    return () => clearTimeout(timer);
  }, [customAlias]);

  // Pre-publish heuristic validation
  useEffect(() => {
    const warnings: string[] = [];
    if (destinationUrl) {
      try {
        const parsed = new URL(destinationUrl);
        if (parsed.protocol === 'http:') {
          warnings.push('Destination uses unencrypted HTTP instead of HTTPS.');
        }
        if (parsed.hostname.includes('bit.ly') || parsed.hostname.includes('tinyurl.com')) {
          warnings.push('Destination points to another shortener (nested redirection hop).');
        }
      } catch {
        // Handled upon submission
      }
    }
    setPrePublishWarnings(warnings);
  }, [destinationUrl]);

  if (!isOpen) return null;

  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!destinationUrl.trim()) {
      setErrorMsg('Please specify a valid destination URL.');
      return;
    }

    try {
      const u = new URL(destinationUrl.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        setErrorMsg('URL scheme must be HTTP or HTTPS.');
        return;
      }
    } catch {
      setErrorMsg('Please enter a valid RFC-compliant URL (e.g. https://example.com).');
      return;
    }

    if (customAlias && aliasStatus && !aliasStatus.available) {
      setErrorMsg('Custom alias is already taken or reserved.');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: Record<string, any> = {
      destinationUrl: destinationUrl.trim(),
      customAlias: customAlias.trim() || undefined,
      title: title.trim() || undefined,
      campaignId: campaignId || undefined,
      password: enablePassword && password.trim() ? password.trim() : undefined,
      expiresAt: enableExpiry && expiresAt ? new Date(expiresAt).toISOString() : undefined,
      clickLimit: enableClickLimit && clickLimit ? parseInt(clickLimit, 10) : undefined,
      deviceRules: enableDeviceRouting && (iosUrl.trim() || androidUrl.trim() || desktopUrl.trim()) ? {
        ios: iosUrl.trim() || undefined,
        android: androidUrl.trim() || undefined,
        desktop: desktopUrl.trim() || undefined
      } : undefined
    };

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to create link.');
        setIsSubmitting(false);
        return;
      }

      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.7 }
        });
      } catch {}

      onLinkCreated(json.link);
      onClose();
    } catch (e) {
      setErrorMsg('Network error. Failed to save link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden relative transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">Create Short Link</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Step {step} of 2: {step === 1 ? 'Destination & Alias' : 'Rules & Expiration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
          <div className={`h-1 bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: DESTINATION & ALIAS */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Destination URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/long-landing-page"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Checked against open-redirect security policies.</p>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Link Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Summer Campaign Landing"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              {/* Custom Alias Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Custom Back-Half / Alias
                  </label>
                  {aliasChecking && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {aliasStatus && !aliasChecking && (
                    <span className={`text-[11px] flex items-center gap-1 font-medium ${aliasStatus.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {aliasStatus.available ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {aliasStatus.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30">
                  <span className="px-3 py-2.5 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 select-none">
                    linkpulse.io/
                  </span>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    placeholder="custom-name (optional)"
                    className="w-full px-3 py-2.5 bg-transparent text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Pre-Publish Warnings */}
              {prePublishWarnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Note
                  </div>
                  {prePublishWarnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-700 dark:text-amber-300/90 pl-5">{w}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: RULES, EXPIRY & ROUTING */
            <div className="space-y-3.5">
              {/* Campaign Picker */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Assign to Campaign
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                >
                  <option value="">No Campaign (Default Workspace)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Protection */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Password Protection</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Require password before redirect</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                {enablePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access password..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                )}
              </div>

              {/* Scheduled Expiry */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Link Expiration</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-expire link after date</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableExpiry}
                    onChange={(e) => setEnableExpiry(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                {enableExpiry && (
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                )}
              </div>

              {/* Click-Cap Limit */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Click Cap</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Limit max number of clicks</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableClickLimit}
                    onChange={(e) => setEnableClickLimit(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                {enableClickLimit && (
                  <input
                    type="number"
                    min="1"
                    value={clickLimit}
                    onChange={(e) => setClickLimit(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                )}
              </div>

              {/* Device Targeting */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Device Targeting</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Custom URLs for iOS / Android / Desktop</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableDeviceRouting}
                    onChange={(e) => setEnableDeviceRouting(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                {enableDeviceRouting && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">iOS Destination URL:</label>
                      <input
                        type="url"
                        value={iosUrl}
                        onChange={(e) => setIosUrl(e.target.value)}
                        placeholder="https://apps.apple.com/..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">Android Destination URL:</label>
                      <input
                        type="url"
                        value={androidUrl}
                        onChange={(e) => setAndroidUrl(e.target.value)}
                        placeholder="https://play.google.com/store/..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1">Desktop Destination URL:</label>
                      <input
                        type="url"
                        value={desktopUrl}
                        onChange={(e) => setDesktopUrl(e.target.value)}
                        placeholder="https://example.com/desktop"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleStep1Next}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              Next: Configure Rules
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                'Create Short Link'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
