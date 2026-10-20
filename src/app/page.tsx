'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, UploadCloud, BarChart3, ShieldCheck,
  Layers, Zap, Share2, Activity, Clock, LogIn, LogOut
} from 'lucide-react';
import LinksTable from '@/components/LinksTable';
import CreateLinkModal from '@/components/CreateLinkModal';
import CsvBulkUploadModal from '@/components/CsvBulkUploadModal';
import QrCodeModal from '@/components/QrCodeModal';
import AnalyticsView from '@/components/AnalyticsView';
import GovernanceAdminView from '@/components/GovernanceAdminView';
import ThemeToggle from '@/components/ThemeToggle';
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
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('linkpulse_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('linkpulse_user');
    setUser(null);
  };

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
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#090d16]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-slate-900 dark:text-white tracking-tight">LinkPulse</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                  Sub-50ms
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">URL Routing & Analytics Engine</p>
            </div>
          </div>

          {/* Action Buttons & Theme Switcher */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <a
              href="/bio/codemaxxing"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Bio Page
            </a>

            <button
              onClick={() => setIsCsvOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Bulk Import
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Link
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
                <div
                  className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center uppercase shadow-2xs"
                  title={user.email}
                >
                  {user.name?.charAt(0) || 'U'}
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Minimal Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">System Status</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">Operational</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hot-path cache active</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Active Links</span>
              <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{links.length}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Shortened routes</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Total Traffic</span>
              <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {totalClicksAcrossLinks.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tracked redirects</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Redirect Target</span>
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">&lt;50ms</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">RFC 9110 HTTP 302/307</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl max-w-fit border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab('links');
              setSelectedAnalyticsLinkId(undefined);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'links'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Links ({links.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'governance'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Governance
          </button>
        </div>

        {/* Tab 1: Links Management Hub */}
        {activeTab === 'links' && (
          <div className="space-y-5">
            {/* Campaigns Ribbon */}
            {campaigns.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                        style={{
                          backgroundColor: `${camp.color}15`,
                          color: camp.color,
                          border: `1px solid ${camp.color}30`
                        }}
                      >
                        {camp.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {camp.linkCount} links
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                      {camp.description}
                    </p>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Traffic</span>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {(camp.totalClicks || 0).toLocaleString()} clicks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-300 text-xs">
                <span>Filtering metrics for link: <strong className="font-mono font-medium">{selectedAnalyticsLinkId}</strong></span>
                <button
                  onClick={() => setSelectedAnalyticsLinkId(undefined)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer text-xs"
                >
                  View All Metrics
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
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 py-6 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 LinkPulse — High-Performance URL Shortener</p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>RFC 9110 HTTP 302/307</span>
            <span>•</span>
            <span>WHATWG Standard</span>
            <span>•</span>
            <span>OWASP Hardened</span>
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
