'use client';

import React, { useState } from 'react';
import {
  Copy, Check, ExternalLink, QrCode, Lock, Clock,
  Smartphone, Gauge, Ban, CheckCircle, Search, Filter, BarChart3, Globe
} from 'lucide-react';
import { Link, Campaign } from '@/lib/types';

interface LinksTableProps {
  links: Link[];
  campaigns: Campaign[];
  onOpenQr: (link: Link) => void;
  onSelectLinkAnalytics: (linkId: string) => void;
  onToggleActive: (link: Link) => void;
}

export default function LinksTable({
  links,
  campaigns,
  onOpenQr,
  onSelectLinkAnalytics,
  onToggleActive
}: LinksTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (link: Link) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const code = link.customAlias || link.shortCode;
    const url = `${origin}/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.customAlias && link.customAlias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      link.destinationUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.title && link.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCampaign = selectedCampaign === 'all' || link.campaignId === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search links by alias, code, title or destination..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="all">All Campaigns ({links.length})</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Short Link & Alias</th>
                <th className="py-3.5 px-4">Target Destination</th>
                <th className="py-3.5 px-4">Rules & Flags</th>
                <th className="py-3.5 px-4">Campaign</th>
                <th className="py-3.5 px-4 text-right">Telemetry</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching links found. Create your first link using the wizard!
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => {
                  const code = link.customAlias || link.shortCode;
                  const isExpired = link.expiresAt && new Date(link.expiresAt).getTime() < Date.now();
                  const isCapped = link.clickLimit && link.clickCount >= link.clickLimit;

                  return (
                    <tr key={link.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Short Link & Alias */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                              /{code}
                            </span>
                            {link.isBanned ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Suspended
                              </span>
                            ) : isExpired ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Expired
                              </span>
                            ) : isCapped ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Capped
                              </span>
                            ) : !link.isActive ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                                Paused
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Live
                              </span>
                            )}
                          </div>
                          {link.title && (
                            <p className="text-[11px] text-slate-300 font-medium truncate max-w-[200px]">
                              {link.title}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-[220px] truncate" title={link.destinationUrl}>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{link.destinationUrl}</span>
                        </div>
                      </td>

                      {/* Rules & Flags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {link.hasPassword && (
                            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="Password Encrypted">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {link.expiresAt && (
                            <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title={`Expires: ${new Date(link.expiresAt).toLocaleDateString()}`}>
                              <Clock className="w-3 h-3" />
                            </span>
                          )}
                          {link.deviceRules && (
                            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Device-Targeted Routing">
                              <Smartphone className="w-3 h-3" />
                            </span>
                          )}
                          {link.clickLimit && (
                            <span className="p-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono" title={`Cap: ${link.clickLimit}`}>
                              <Gauge className="w-3 h-3 inline mr-0.5" />
                              {link.clickCount}/{link.clickLimit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3.5 px-4">
                        {link.campaign ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              backgroundColor: `${link.campaign.color}20`,
                              color: link.campaign.color,
                              border: `1px solid ${link.campaign.color}40`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: link.campaign.color }} />
                            {link.campaign.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">General</span>
                        )}
                      </td>

                      {/* Clicks */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-sm font-bold text-white">
                          {link.clickCount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 block">clicks</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleCopy(link)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy Short URL"
                          >
                            {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <a
                            href={`/${code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Test Sub-50ms Redirection"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => onOpenQr(link)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectLinkAnalytics(link.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                            title="View Telemetry Insights"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
