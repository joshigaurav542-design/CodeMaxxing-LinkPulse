'use client';

import React, { useState } from 'react';
import { X, Layers, Sparkles, Loader2, Globe, Lock, ShieldCheck } from 'lucide-react';
import { LinkHub } from '@/lib/types';

interface CreateHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHubCreated: (hub: LinkHub) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

const CATEGORIES = [
  'General',
  'Hackathon & Tech',
  'Marketing & Sales',
  'Developer Tools',
  'Product Launches',
  'Community & Social',
  'Design & Creative',
  'Other'
];

const THEME_COLORS = [
  { name: 'Indigo Pulse', hex: '#6366f1' },
  { name: 'Emerald Spark', hex: '#10b981' },
  { name: 'Cyan Wave', hex: '#06b6d4' },
  { name: 'Rose Flame', hex: '#f43f5e' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Violet Dream', hex: '#8b5cf6' }
];

export default function CreateHubModal({
  isOpen,
  onClose,
  onHubCreated,
  userId,
  userName,
  userEmail
}: CreateHubModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [color, setColor] = useState('#6366f1');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate slug from name if slug hasn't been heavily customized
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a name for your link hub.');
      return;
    }

    if (!slug.trim()) {
      setErrorMsg('Please enter a unique slug identifier.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/hubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          category,
          color,
          isPublic,
          adminId: userId,
          adminName: userName,
          adminEmail: userEmail
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to create link hub.');
        setIsSubmitting(false);
        return;
      }

      onHubCreated(data.hub);
      onClose();
    } catch {
      setErrorMsg('Network error. Unable to reach server.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Create New Link Hub</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You will be designated as the <strong>Hub Admin</strong> to manage all links.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Hub Name */}
          <div>
            <label htmlFor="hub-name-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Hub Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="hub-name-input"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Innovista Hackathon Project Hub"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              autoFocus
              required
            />
          </div>

          {/* Slug Identifier */}
          <div>
            <label htmlFor="hub-slug-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Hub Slug Identifier <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus-within:ring-2 focus-within:ring-indigo-500/30">
              <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 select-none">
                linkpulse.io/hub/
              </span>
              <input
                id="hub-slug-input"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="innovista-2026"
                className="w-full px-3 py-2.5 bg-transparent text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Public link for visitors to browse this hub.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="hub-description-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              id="hub-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of links collected in this hub..."
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none"
            />
          </div>

          {/* Category & Accent Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="hub-category-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="hub-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {THEME_COLORS.map((tc) => (
                  <button
                    key={tc.hex}
                    type="button"
                    onClick={() => setColor(tc.hex)}
                    title={tc.name}
                    className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                      color === tc.hex
                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: tc.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hub Visibility Selection (Public vs Private) */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Hub Access & Visibility <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Public Hub */}
              <div
                onClick={() => setIsPublic(true)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                  isPublic
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${isPublic ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Public Hub</h4>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Open & Discoverable</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isPublic ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isPublic && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                  Visitors are allowed to browse and discover this hub. Anyone can view links and request contributor access.
                </p>
              </div>

              {/* Option 2: Private Hub */}
              <div
                onClick={() => setIsPublic(false)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                  !isPublic
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${!isPublic ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Private Hub</h4>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Direct Link Only</span>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isPublic ? 'border-amber-500 bg-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {!isPublic && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                  Hidden from public catalogs. Only accessible through direct secret links sent by you to trusted users.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Tag Notice */}
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Admin Rights:</strong> As creator, you ({userName}) will have full authority to add, edit, toggle, and delete links on this hub.
            </span>
          </div>

          {/* Submit & Cancel */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating Hub...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Create Link Hub
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
