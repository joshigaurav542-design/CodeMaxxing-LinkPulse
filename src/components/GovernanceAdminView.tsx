'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Ban, Plus, Trash2, Zap,
  Activity, CheckCircle2, AlertTriangle, Loader2, Search
} from 'lucide-react';
import { DomainBlocklist, Link } from '@/lib/types';

interface GovernanceAdminViewProps {
  links: Link[];
  onLinksUpdated: () => void;
}

export default function GovernanceAdminView({ links, onLinksUpdated }: GovernanceAdminViewProps) {
  const [blocklist, setBlocklist] = useState<DomainBlocklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  // Link deletion and governance state
  const [linkSearch, setLinkSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchBlocklist = async () => {
    try {
      const res = await fetch('/api/governance/blocklist');
      const data = await res.json();
      if (data.success) {
        setBlocklist(data.blocklist);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocklist();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/governance/blocklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim(), reason: newReason.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewDomain('');
        setNewReason('');
        fetchBlocklist();
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (id: string, domain: string) => {
    try {
      await fetch(`/api/governance/blocklist?id=${id}&domain=${domain}`, { method: 'DELETE' });
      fetchBlocklist();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTakedown = async (link: Link) => {
    const nextBannedState = !link.isBanned;
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: nextBannedState })
      });
      if (res.ok) {
        setActionNotice({
          text: nextBannedState
            ? `Link /${link.customAlias || link.shortCode} suspended. Invalidation sent to Redis.`
            : `Link /${link.customAlias || link.shortCode} reinstated successfully.`,
          type: 'success'
        });
        setTimeout(() => setActionNotice(null), 4000);
        onLinksUpdated();
      }
    } catch (e) {
      console.error(e);
      setActionNotice({ text: 'Failed to update link status', type: 'error' });
    }
  };

  const handleDeleteLink = async (link: Link) => {
    setDeletingId(link.id);
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteConfirmId(null);
        setActionNotice({
          text: `Link /${link.customAlias || link.shortCode} was permanently removed from the website and purged from cache.`,
          type: 'success'
        });
        setTimeout(() => setActionNotice(null), 4000);
        onLinksUpdated();
      } else {
        setActionNotice({ text: data.error || 'Failed to delete link', type: 'error' });
      }
    } catch (e: any) {
      console.error(e);
      setActionNotice({ text: `Deletion error: ${e.message}`, type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSimulateTraffic = async (count: number = 20) => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/simulate-traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(`Generated ${count} asynchronous telemetry events.`);
        onLinksUpdated();
      }
    } catch (e: any) {
      setSimResult(`Simulation error: ${e.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const filteredLinks = links.filter((l) => {
    if (!linkSearch.trim()) return true;
    const q = linkSearch.toLowerCase();
    return (
      (l.shortCode ?? '').toLowerCase().includes(q) ||
      (l.customAlias ?? '').toLowerCase().includes(q) ||
      (l.destinationUrl ?? '').toLowerCase().includes(q) ||
      (l.title ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Simulator Card */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 mb-1.5">
              <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Traffic Simulator
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Telemetry & Queue Testing</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-0.5">
              Simulate high-concurrency traffic bursts to verify non-blocking event processing and analytics streaming.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTraffic(15)}
              disabled={simulating}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              +15 Clicks
            </button>

            <button
              onClick={() => handleSimulateTraffic(50)}
              disabled={simulating}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              +50 Clicks
            </button>
          </div>
        </div>

        {simResult && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{simResult}</span>
          </div>
        )}
      </div>

      {/* Grid: Global Takedowns Table & Domain Blocklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Link Takedowns & Permanent Removal */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Link Governance & Removal
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Suspend traffic or permanently remove links straight from the website</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {links.length} total links
              </span>
            </div>
          </div>

          {/* Action notification feedback */}
          {actionNotice && (
            <div
              className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 animate-in fade-in ${
                actionNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{actionNotice.text}</span>
            </div>
          )}

          {/* Quick Filter */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search links to govern or remove..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLinks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No links found matching &ldquo;{linkSearch}&rdquo;.</p>
            ) : (
              filteredLinks.map((link) => (
                <div
                  key={link.id}
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    deleteConfirmId === link.id
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 ring-1 ring-rose-500/30'
                      : link.isBanned
                      ? 'bg-rose-50/50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                      : 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-0.5 truncate min-w-0 max-w-full sm:max-w-[210px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">/{link.customAlias || link.shortCode}</span>
                      {link.isBanned && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-medium">
                          Banned
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={link.destinationUrl}>
                      {link.destinationUrl}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {link.clickCount.toLocaleString()} clicks
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {deleteConfirmId === link.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950/70 p-1.5 rounded-lg border border-rose-300 dark:border-rose-500/50 animate-in fade-in">
                        <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 hidden sm:inline">Delete?</span>
                        <button
                          onClick={() => handleDeleteLink(link)}
                          disabled={deletingId === link.id}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                          title="Confirm permanent deletion"
                        >
                          {deletingId === link.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deletingId === link.id}
                          className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleTakedown(link)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                            link.isBanned
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-600/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          }`}
                          title={link.isBanned ? 'Reinstate Link' : 'Suspend Traffic'}
                        >
                          <Ban className="w-3 h-3" />
                          {link.isBanned ? 'Reinstate' : 'Suspend'}
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(link.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/25 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 transition cursor-pointer flex items-center gap-1"
                          title="Straight up remove link from the platform"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Domain Blocklist */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Domain Blocklist
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Block known malicious hostnames</p>
            </div>
          </div>

          {/* Add domain form */}
          <form onSubmit={handleAddDomain} className="space-y-2 mb-3.5 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="domain.com"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason (e.g. Phishing)"
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              className="w-full py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Blocklist
            </button>
          </form>

          {/* Blocklist Table */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {blocklist.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No blocked domains.</p>
            ) : (
              blocklist.map((b) => (
                <div key={b.id} className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-medium">{b.domain}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.reason || 'Malicious'}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveDomain(b.id, b.domain)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remove from blocklist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
