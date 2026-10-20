'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, UploadCloud, BarChart3, ShieldCheck,
  Layers, Zap, Share2, Activity, Clock, LogIn, LogOut,
  Globe, UserCheck, ShieldAlert, AlertCircle, Info, Lock
} from 'lucide-react';
import LinksTable from '@/components/LinksTable';
import CreateLinkModal from '@/components/CreateLinkModal';
import CsvBulkUploadModal from '@/components/CsvBulkUploadModal';
import QrCodeModal from '@/components/QrCodeModal';
import AnalyticsView from '@/components/AnalyticsView';
import GovernanceAdminView from '@/components/GovernanceAdminView';
import ThemeToggle from '@/components/ThemeToggle';
import UserRoleModal from '@/components/UserRoleModal';
import { Link, Campaign, Role } from '@/lib/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'links' | 'analytics' | 'governance'>('links');
  const [links, setLinks] = useState<Link[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // User & RBAC state
  const [user, setUser] = useState<{ id?: string; email: string; name: string; role?: Role } | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('ADMIN');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [visitorAlert, setVisitorAlert] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState<Link | null>(null);
  const [selectedAnalyticsLinkId, setSelectedAnalyticsLinkId] = useState<string | undefined>(undefined);

  // Check stored user session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('linkpulse_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setActiveRole(u.role || 'USER');
      } else {
        // Default to Admin in demo mode, but allow switching to any role
        setActiveRole('ADMIN');
      }
    } catch {
      setActiveRole('ADMIN');
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('linkpulse_user');
    setUser(null);
    setActiveRole('VISITOR');
  };

  const handleRoleChange = (newRole: Role) => {
    setActiveRole(newRole);
    if (newRole === 'VISITOR') {
      setUser(null);
    } else if (newRole === 'USER' && !user) {
      setUser({
        id: 'usr-marketer-002',
        name: 'CodeMaxxing Lead',
        email: 'team.lead@codemaxxing.dev',
        role: 'USER'
      });
    } else if (newRole === 'ADMIN' && !user) {
      setUser({
        id: 'usr-admin-001',
        name: 'Gaurav Joshi (Admin)',
        email: 'gaurav.joshi@gehu.ac.in',
        role: 'ADMIN'
      });
    }
  };

  const fetchData = async () => {
    try {
      // Role-based links fetching
      const linksUrl = activeRole === 'USER' && user?.id
        ? `/api/links?userId=${user.id}&role=USER`
        : '/api/links?role=ADMIN';

      const [linksRes, campaignsRes] = await Promise.all([
        fetch(linksUrl),
        fetch('/api/campaigns')
      ]);
      const linksJson = await linksRes.json();
      const campaignsJson = await campaignsRes.json();

      if (linksJson.success) setLinks(linksJson.links);
      if (campaignsJson.success) setCampaigns(campaignsJson.campaigns);
    } catch (e) {
      console.error('Error fetching data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole, user?.id]);

  const handleLinkCreated = (newLink: Link) => {
    setLinks((prev) => [newLink, ...prev]);
    fetchData();
  };

  const handleToggleActive = async (link: Link) => {
    if (activeRole === 'VISITOR') {
      setVisitorAlert('Visitor role cannot toggle link status. Please sign in as User or Admin.');
      return;
    }

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

  const handleDeleteLink = async (link: Link) => {
    if (activeRole === 'VISITOR') {
      setVisitorAlert('Visitors have no management access to delete links.');
      return;
    }

    try {
      const res = await fetch(`/api/links/${link.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreateModal = () => {
    if (activeRole === 'VISITOR') {
      setVisitorAlert('Visitors have no management access. Please sign in or switch to User / Admin role to create links.');
      return;
    }
    setVisitorAlert(null);
    setIsCreateOpen(true);
  };

  const handleOpenCsvModal = () => {
    if (activeRole === 'VISITOR') {
      setVisitorAlert('Visitors cannot bulk import links. Please sign in as User or Admin.');
      return;
    }
    setVisitorAlert(null);
    setIsCsvOpen(true);
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

          {/* Action Buttons, RBAC Badge & Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* User Role Badge (Clickable to open User Roles modal) */}
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              title="Click to view & switch User Roles"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                activeRole === 'ADMIN'
                  ? 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-500/30'
                  : activeRole === 'USER'
                  ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/30'
                  : 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-500/30'
              }`}
            >
              {activeRole === 'ADMIN' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ) : activeRole === 'USER' ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span>{activeRole === 'ADMIN' ? 'Admin' : activeRole === 'USER' ? 'User' : 'Visitor'}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal underline ml-0.5">Roles</span>
            </button>

            <ThemeToggle />

            <a
              href="/bio/codemaxxing"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Bio Page
            </a>

            <button
              onClick={handleOpenCsvModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Bulk Import
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-medium shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Link
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
                <div
                  className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center uppercase shadow-2xs"
                  title={`${user.name} (${user.email})`}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        {/* Visitor Role Warning / Guidance Banner */}
        {activeRole === 'VISITOR' && (
          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>
                <strong>Visitor Mode (Anonymous):</strong> You can open short links and enter passwords. Link creation, campaigns, and governance require signing in.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="text-xs text-sky-700 dark:text-sky-300 underline font-medium hover:text-sky-900 cursor-pointer"
              >
                View Roles Guide
              </button>
              <a
                href="/login"
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                Sign In
              </a>
            </div>
          </div>
        )}

        {/* Temporary Action Alert */}
        {visitorAlert && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{visitorAlert}</span>
            </div>
            <button
              onClick={() => setVisitorAlert(null)}
              className="text-amber-700 hover:text-amber-900 text-xs font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

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
              <span className="text-xs font-medium">
                {activeRole === 'USER' ? 'Your Links' : 'Active Links'}
              </span>
              <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{links.length}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeRole === 'USER' ? 'Managed by you' : 'Platform routes'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">
                {activeRole === 'USER' ? 'Your Traffic' : 'Total Traffic'}
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {totalClicksAcrossLinks.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeRole === 'USER' ? 'Clicks on your links' : 'Tracked redirects'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Active Role</span>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white capitalize">
              {activeRole === 'ADMIN' ? 'Admin' : activeRole === 'USER' ? 'User' : 'Visitor'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeRole === 'ADMIN' ? 'Full platform scope' : activeRole === 'USER' ? 'Own links only' : 'Read-only access'}
            </p>
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
            {activeRole === 'USER' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                Own
              </span>
            )}
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
            {activeRole !== 'ADMIN' && (
              <Lock className="w-3 h-3 text-slate-400 ml-0.5" />
            )}
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

            {/* Scope info for User role */}
            {activeRole === 'USER' && (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <strong>User Scope Active:</strong> Managing your own links and campaigns.
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                  {links.length} personal links
                </span>
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
              onDeleteLink={handleDeleteLink}
              userRole={activeRole}
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
            <AnalyticsView
              linkId={selectedAnalyticsLinkId}
              userId={user?.id}
              userRole={activeRole}
            />
          </div>
        )}

        {/* Tab 3: Governance & Admin Console */}
        {activeTab === 'governance' && (
          activeRole === 'ADMIN' ? (
            <GovernanceAdminView links={links} onLinksUpdated={fetchData} />
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-2xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Admin Role Required
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {activeRole === 'USER'
                    ? 'Users can manage their own links, campaigns, tags, and QR codes. Disabling abusive links and managing platform domain blocklists is restricted to Administrators.'
                    : 'Visitors have no management access. Please sign in as an Administrator to access the governance console.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2.5">
                <button
                  onClick={() => handleRoleChange('ADMIN')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Switch to Admin (Simulate)
                </button>
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                  View Roles Guide
                </button>
              </div>
            </div>
          )
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

      {/* User Role Modal */}
      <UserRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={activeRole}
        onSelectRole={handleRoleChange}
      />

      {/* Modals */}
      <CreateLinkModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        campaigns={campaigns}
        onLinkCreated={handleLinkCreated}
        userId={user?.id}
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
