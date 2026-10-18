'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Ban, Plus, Trash2, Zap,
  Activity, Server, Database, CheckCircle2, AlertTriangle, Loader2
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
        onLinksUpdated();
      }
    } catch (e) {
      console.error(e);
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
        setSimResult(`Dispatched ${count} async telemetry events through BullMQ queue! Redis counters updated.`);
        onLinksUpdated();
      }
    } catch (e: any) {
      setSimResult(`Simulation error: ${e.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Hackathon Live Demo Simulator */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-blue-900/40 border border-indigo-500/30 backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400" /> Hackathon Live Demo Mode
            </div>
            <h2 className="text-xl font-bold text-white mb-1">High-Concurrency Live Traffic Simulator</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Demonstrate the decoupled architecture live in 5 minutes: Spawns non-blocking telemetry events with authentic Geo-IPs and device distributions while keeping redirects sub-50ms!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTraffic(15)}
              disabled={simulating}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/40 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Burst +15 Clicks
            </button>

            <button
              onClick={() => handleSimulateTraffic(50)}
              disabled={simulating}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/40 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              Burst +50 Clicks
            </button>
          </div>
        </div>

        {simResult && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{simResult}</span>
          </div>
        )}
      </div>

      {/* Grid: Global Takedowns Table & Domain Blocklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Link Takedowns with Auditability */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Instant Link Governance & Takedowns
              </h3>
              <p className="text-xs text-slate-400">Invalidates Redis hot-path cache while preserving historical analytics</p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {links.map((link) => (
              <div
                key={link.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                  link.isBanned
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="space-y-1 truncate max-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">/{link.shortCode}</span>
                    {link.isBanned && (
                      <span className="px-2 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-400 font-semibold">
                        Banned
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{link.destinationUrl}</p>
                  <p className="text-[10px] text-slate-500">{link.clickCount} all-time recorded clicks</p>
                </div>

                <button
                  onClick={() => handleToggleTakedown(link)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    link.isBanned
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {link.isBanned ? 'Reinstate Link' : 'Take Down'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Global Domain Blocklist */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Platform Domain Blocklist
              </h3>
              <p className="text-xs text-slate-400">Cached in Redis Set for O(1) membership rejection</p>
            </div>
          </div>

          {/* Add domain form */}
          <form onSubmit={handleAddDomain} className="space-y-2 mb-4 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="domain.com"
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason (e.g. Phishing)"
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Block Domain Globally
            </button>
          </form>

          {/* Blocklist Table */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {blocklist.map((b) => (
              <div key={b.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-rose-300 font-semibold">{b.domain}</span>
                  <p className="text-[11px] text-slate-400">{b.reason}</p>
                </div>
                <button
                  onClick={() => handleRemoveDomain(b.id, b.domain)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Remove from blocklist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
