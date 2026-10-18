'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, UploadCloud, BarChart3, ShieldCheck, Sparkles,
  Layers, ExternalLink, Zap, RefreshCw, Cpu, Activity, Share2
} from 'lucide-react';
import LinksTable from '@/components/LinksTable';
import CreateLinkModal from '@/components/CreateLinkModal';
import CsvBulkUploadModal from '@/components/CsvBulkUploadModal';
import QrCodeModal from '@/components/QrCodeModal';
import AnalyticsView from '@/components/AnalyticsView';
import GovernanceAdminView from '@/components/GovernanceAdminView';
import { Link, Campaign } from '@/lib/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'links' | 'analytics' | 'governance'>('links');
  const [links, setLinks] = useState<Link[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState<Link | null>(null);
  const [selectedAnalyticsLinkId, setSelectedAnalyticsLinkId] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    try {
      const [linksRes, campaignsRes] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/campaigns')
      ]);
      const linksJson = await linksRes.json();
      const campaignsJson = await campaignsRes.json();

      if (linksJson.success) setLinks(linksJson.links);
      if (campaignsJson.success) setCampaigns(campaignsJson.campaigns);
    } catch (e) {
      console.error('Error fetching initial data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinkCreated = (newLink: Link) => {
    setLinks((prev) => [newLink, ...prev]);
    fetchData();
  };

  const handleToggleActive = async (link: Link) => {
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalClicksAcrossLinks = links.reduce((acc, l) => acc + (l.clickCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Ambient Glow Highlights */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">LinkPulse</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Sub-50ms Hot Path
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Team CodeMaxxing • Graphic Era Hill University</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="/bio/codemaxxing"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-400" />
              Link-in-Bio
            </a>

            <button
              onClick={() => setIsCsvOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              Bulk CSV Import
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Short Link
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Architecture Status Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">System Architecture Status: Online</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-slate-400">
                Layer 4A Redis in-memory cache active • Layer 4B BullMQ worker polling • RFC 9110 HTTP 302/307 ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Target: &lt;50ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>{links.length} Active Links</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{totalClicksAcrossLinks.toLocaleString()} Total Clicks</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => {
              setActiveTab('links');
              setSelectedAnalyticsLinkId(undefined);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'links'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Links Management Hub ({links.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Live Analytics & Recharts
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'governance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Governance & Admin Console
          </button>
        </div>

        {/* Tab 1: Links Management Hub */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Campaigns Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: `${camp.color}20`,
                        color: camp.color,
                        border: `1px solid ${camp.color}40`
                      }}
                    >
                      {camp.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{camp.linkCount} links</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mb-3">{camp.description}</p>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500 font-medium">Aggregated Traffic</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {(camp.totalClicks || 0).toLocaleString()} clicks
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Links Table */}
            <LinksTable
              links={links}
              campaigns={campaigns}
              onOpenQr={(link) => setQrModalLink(link)}
              onSelectLinkAnalytics={(id) => {
                setSelectedAnalyticsLinkId(id);
                setActiveTab('analytics');
              }}
              onToggleActive={handleToggleActive}
            />
          </div>
        )}

        {/* Tab 2: Live Analytics & Recharts */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {selectedAnalyticsLinkId && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <span>Filtering metrics for selected link ID: <strong className="font-mono">{selectedAnalyticsLinkId}</strong></span>
                <button
                  onClick={() => setSelectedAnalyticsLinkId(undefined)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-white font-medium cursor-pointer"
                >
                  Show Global Platform Metrics
                </button>
              </div>
            )}
            <AnalyticsView linkId={selectedAnalyticsLinkId} />
          </div>
        )}

        {/* Tab 3: Governance & Admin Console */}
        {activeTab === 'governance' && (
          <GovernanceAdminView links={links} onLinksUpdated={fetchData} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 LinkPulse — Built for TECH GEEKS Hackathon • Graphic Era Hill University</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RFC 9110 HTTP 302/307</span>
            <span>•</span>
            <span>WHATWG URL Standard</span>
            <span>•</span>
            <span>OWASP Redirection Hardened</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateLinkModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        campaigns={campaigns}
        onLinkCreated={handleLinkCreated}
      />

      <CsvBulkUploadModal
        isOpen={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        onLinksImported={fetchData}
      />

      {qrModalLink && (
        <QrCodeModal
          isOpen={Boolean(qrModalLink)}
          onClose={() => setQrModalLink(null)}
          shortUrl={
            typeof window !== 'undefined'
              ? `${window.location.origin}/${qrModalLink.customAlias || qrModalLink.shortCode}`
              : `http://localhost:3000/${qrModalLink.customAlias || qrModalLink.shortCode}`
          }
          title={qrModalLink.title || qrModalLink.shortCode}
        />
      )}
    </div>
  );
}
