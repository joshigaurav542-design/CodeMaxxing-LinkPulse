'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, UploadCloud, BarChart3, ShieldCheck,
  Layers, Zap, Activity, Clock, LogIn, LogOut,
  Globe, UserCheck, ShieldAlert, AlertCircle, Info, Lock,
  Sparkles, ArrowRight
} from 'lucide-react';
import LinksTable from '@/components/LinksTable';
import CreateLinkModal from '@/components/CreateLinkModal';
import CsvBulkUploadModal from '@/components/CsvBulkUploadModal';
import QrCodeModal from '@/components/QrCodeModal';
import AnalyticsView from '@/components/AnalyticsView';
import GovernanceAdminView from '@/components/GovernanceAdminView';
import LinkHubsView from '@/components/LinkHubsView';
import ActivityView from '@/components/ActivityView';
import ThemeToggle from '@/components/ThemeToggle';
import UserRoleModal from '@/components/UserRoleModal';
import { Link, Campaign, Role, LinkHub } from '@/lib/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'hubs' | 'links' | 'analytics' | 'activity' | 'governance'>('hubs');
  const [links, setLinks] = useState<Link[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hubs, setHubs] = useState<LinkHub[]>([]);
  const [loading, setLoading] = useState(true);

  // User & RBAC state
  const [user, setUser] = useState<{ id?: string; email: string; name: string; role?: Role } | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('ADMIN');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [visitorAlert, setVisitorAlert] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedHubIdForCreate, setSelectedHubIdForCreate] = useState<string | undefined>(undefined);
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
        // Default to Gaurav Joshi (Admin) for seamless paired experience, or allow switching
        const defaultAdmin = {
          id: 'usr-admin-001',
          name: 'Gaurav Joshi (Admin)',
          email: 'gaurav.joshi@gehu.ac.in',
          role: 'ADMIN' as Role
        };
        setUser(defaultAdmin);
        setActiveRole('ADMIN');
        try {
          localStorage.setItem('linkpulse_user', JSON.stringify(defaultAdmin));
        } catch {}
      }
    } catch {
      setActiveRole('ADMIN');
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('linkpulse_user');
    setUser(null);
    setActiveRole('VISITOR');
    setActiveTab('hubs');
    setSelectedAnalyticsLinkId(undefined);
  };

  const handleQuickSignIn = (selectedUser: { id: string; email: string; name: string; role: Role }) => {
    setUser(selectedUser);
    setActiveRole(selectedUser.role);
    try {
      localStorage.setItem('linkpulse_user', JSON.stringify(selectedUser));
    } catch {}
    setActiveTab('hubs');
  };

  const handleRoleChange = (newRole: Role) => {
    setActiveRole(newRole);
    if (newRole === 'VISITOR') {
      setUser(null);
      setActiveTab('hubs');
      setSelectedAnalyticsLinkId(undefined);
    } else if (newRole === 'USER') {
      const u = {
        id: 'usr-marketer-002',
        name: 'CodeMaxxing Lead',
        email: 'team.lead@codemaxxing.dev',
        role: 'USER' as Role
      };
      setUser(u);
      try {
        localStorage.setItem('linkpulse_user', JSON.stringify(u));
      } catch {}
      if (activeTab === 'governance') {
        setActiveTab('hubs');
      }
    } else if (newRole === 'ADMIN') {
      const u = {
        id: 'usr-admin-001',
        name: 'Gaurav Joshi (Admin)',
        email: 'gaurav.joshi@gehu.ac.in',
        role: 'ADMIN' as Role
      };
      setUser(u);
      try {
        localStorage.setItem('linkpulse_user', JSON.stringify(u));
      } catch {}
    }
  };

  const fetchData = async () => {
    try {
      // Role-based links fetching
      const linksUrl = activeRole === 'USER' && user?.id
        ? `/api/links?userId=${user.id}&role=USER`
        : '/api/links?role=ADMIN';

      const hubsUrl = user?.id ? `/api/hubs?userId=${user.id}` : '/api/hubs';

      const [linksRes, campaignsRes, hubsRes] = await Promise.all([
        fetch(linksUrl),
        fetch('/api/campaigns'),
        fetch(hubsUrl)
      ]);
      const linksJson = await linksRes.json();
      const campaignsJson = await campaignsRes.json();
      const hubsJson = await hubsRes.json();

      if (linksJson.success) setLinks(linksJson.links);
      if (campaignsJson.success) setCampaigns(campaignsJson.campaigns);
      if (hubsJson.success) setHubs(hubsJson.hubs);
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

  const handleOpenCreateModal = (hubId?: string) => {
    if (activeRole === 'VISITOR') {
      setVisitorAlert('Visitors have no management access. Please sign in to create links.');
      return;
    }
    setVisitorAlert(null);
    setSelectedHubIdForCreate(hubId);
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
                  Link Hubs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Micro-Redirection & Collaboration Engine</p>
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

            <button
              onClick={handleOpenCsvModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Bulk Import
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
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
        {/* Sign In Prompt Gate if user is not signed in */}
        {!user && (
          <div className="p-7 sm:p-9 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xl text-center max-w-2xl mx-auto space-y-5 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to LinkPulse
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Sign in to view link hubs, create link hubs, request user access to hubs, and track your activity.
              </p>
            </div>

            {/* Quick 1-Click Sign-in Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button
                type="button"
                onClick={() =>
                  handleQuickSignIn({
                    id: 'usr-admin-001',
                    name: 'Gaurav Joshi (Admin)',
                    email: 'gaurav.joshi@gehu.ac.in',
                    role: 'ADMIN'
                  })
                }
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all flex items-center gap-3 cursor-pointer group shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-xs">
                  GJ
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      Gaurav Joshi
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">gaurav.joshi@gehu.ac.in</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickSignIn({
                    id: 'usr-marketer-002',
                    name: 'CodeMaxxing Lead',
                    email: 'team.lead@codemaxxing.dev',
                    role: 'USER'
                  })
                }
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10 transition-all flex items-center gap-3 cursor-pointer group shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                  CL
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                      CodeMaxxing Lead
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      USER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">team.lead@codemaxxing.dev</p>
                </div>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <a
                href="/login"
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-xs transition-all text-center"
              >
                Sign In with Email / Register
              </a>
              <button
                type="button"
                onClick={() => {
                  handleQuickSignIn({
                    id: 'usr-visitor-guest',
                    name: 'Guest Visitor',
                    email: 'visitor@linkpulse.io',
                    role: 'VISITOR'
                  });
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-xs transition-all cursor-pointer"
              >
                Browse Hubs as Visitor
              </button>
            </div>
          </div>
        )}

        {/* Visitor Role Warning / Guidance Banner */}
        {activeRole === 'VISITOR' && user && (
          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>
                <strong>Visitor Mode:</strong> You can view link hubs as a visitor. To add links to a hub, click <strong>"Get User Access"</strong> on that hub.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="text-xs text-sky-700 dark:text-sky-300 underline font-medium hover:text-sky-900 cursor-pointer"
              >
                Switch Role
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

        {/* Action Alert Banner */}
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
              <span className="text-xs font-medium">Link Hubs</span>
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {hubs.length} Hubs
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Admin-controlled hubs</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Active Links</span>
              <Link2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {links.length} Links
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">High-speed routes</p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Tracked Traffic</span>
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {totalClicksAcrossLinks.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeRole === 'USER' ? 'Clicks on your links' : 'Total redirects'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-medium">Active Session</span>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {user ? user.name : 'Visitor'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
              Role: {activeRole.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl max-w-fit border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => {
              setActiveTab('hubs');
              setSelectedAnalyticsLinkId(undefined);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'hubs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Link Hubs ({hubs.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('links');
              setSelectedAnalyticsLinkId(undefined);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'links'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            All Links ({links.length})
          </button>

          {activeRole !== 'VISITOR' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
          )}

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Your Activity
          </button>

          {activeRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('governance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'governance'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              Governance
            </button>
          )}
        </div>

        {/* TAB 0: LINK HUBS (Primary Default View) */}
        {activeTab === 'hubs' && (
          <LinkHubsView
            currentUser={user}
            onOpenCreateLinkModal={(hubId) => handleOpenCreateModal(hubId)}
            onOpenQrModal={(link) => setQrModalLink(link)}
          />
        )}

        {/* TAB 1: ALL LINKS */}
        {activeTab === 'links' && (
          <div className="space-y-5">
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
                    {activeRole !== 'VISITOR' && (
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Traffic</span>
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          {(camp.totalClicks || 0).toLocaleString()} clicks
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

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

        {/* TAB 2: ANALYTICS */}
        {activeTab === 'analytics' && activeRole !== 'VISITOR' && (
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

        {/* TAB 3: YOUR ACTIVITY */}
        {activeTab === 'activity' && (
          <ActivityView currentUser={user} />
        )}

        {/* TAB 4: GOVERNANCE */}
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
                  Visitors have no management access. Please sign in as an Administrator to access the governance console.
                </p>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 py-6 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 LinkPulse — High-Performance URL Shortener & Link Hubs</p>
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
        onClose={() => {
          setIsCreateOpen(false);
          setSelectedHubIdForCreate(undefined);
        }}
        campaigns={campaigns}
        hubs={hubs}
        initialHubId={selectedHubIdForCreate}
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
