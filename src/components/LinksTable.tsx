'use client';

import React, { useState } from 'react';
import {
  Copy, Check, ExternalLink, QrCode, Lock, Clock,
  Smartphone, Gauge, Search, Filter, BarChart3, Globe
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

  
const handleCopy = async (link: Link) => {
  const origin = window.location.origin;
  const code = link.customAlias || link.shortCode;
  const url = `${origin}/${code}`;

  try {
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  } catch (error) {
    console.error('Failed to copy short URL:', error);
    alert('Could not copy the link. Please try again.');
  }
};


  const filteredLinks = links.filter((link) => {
    const search = searchTerm.toLowerCase();

const matchesSearch =
  (link.shortCode ?? '').toLowerCase().includes(search) ||
  (link.customAlias ?? '').toLowerCase().includes(search) ||
  (link.destinationUrl ?? '').toLowerCase().includes(search) ||
  (link.title ?? '').toLowerCase().includes(search);

    const matchesCampaign = selectedCampaign === 'all' || link.campaignId === selectedCampaign;

    return matchesSearch && matchesCampaign;
  });

  return (
    <div className="space-y-3.5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by alias, code, title or destination..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer shadow-2xs"
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
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Short Link & Alias</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Rules</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4 text-right">Traffic</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
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
                    <tr key={link.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group">
                      {/* Short Link & Alias */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              /{code}
                            </span>
                            {link.isBanned ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                                Suspended
                              </span>
                            ) : isExpired ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                Expired
                              </span>
                            ) : isCapped ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                Capped
                              </span>
                            ) : !link.isActive ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Paused
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Live
                              </span>
                            )}
                          </div>
                          {link.title && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {link.title}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] truncate" title={link.destinationUrl}>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{link.destinationUrl}</span>
                        </div>
                      </td>

                      {/* Rules & Flags */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {link.hasPassword && (
                            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20" title="Password Protected">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {link.expiresAt && (
                            <span className="p-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20" title={`Expires: ${new Date(link.expiresAt).toLocaleDateString()}`}>
                              <Clock className="w-3 h-3" />
                            </span>
                          )}
                          {link.deviceRules && (
                            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20" title="Device-Targeted Routing">
                              <Smartphone className="w-3 h-3" />
                            </span>
                          )}
                          {link.clickLimit && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 text-[10px] font-mono" title={`Cap: ${link.clickLimit}`}>
                              <Gauge className="w-3 h-3 inline mr-1" />
                              {link.clickCount}/{link.clickLimit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3 px-4">
                        {link.campaign ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                            style={{
                              backgroundColor: `${link.campaign.color}15`,
                              color: link.campaign.color,
                              border: `1px solid ${link.campaign.color}30`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: link.campaign.color }} />
                            {link.campaign.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">General</span>
                        )}
                      </td>

                      {/* Clicks */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          {link.clickCount.toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopy(link)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Copy Short URL"
                          >
                            {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <a
                            href={`/${code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Test Redirection"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => onOpenQr(link)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectLinkAnalytics(link.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Analytics"
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
