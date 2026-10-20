'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, UploadCloud, BarChart3, ShieldCheck,
  Layers, Zap, Activity, Clock, LogIn, LogOut,
  Globe, ShieldAlert, AlertCircle, Info, Lock,
  Sparkles, ArrowRight, ArrowLeft
} from 'lucide-react';
import CreateLinkModal from '@/components/CreateLinkModal';
import CsvBulkUploadModal from '@/components/CsvBulkUploadModal';
import QrCodeModal from '@/components/QrCodeModal';
import GovernanceAdminView from '@/components/GovernanceAdminView';
import LinkHubsView from '@/components/LinkHubsView';
import ActivityView from '@/components/ActivityView';
import ThemeToggle from '@/components/ThemeToggle';
import UserRoleModal from '@/components/UserRoleModal';
import { Link, Campaign, Role, LinkHub } from '@/lib/types';
import { logSupabaseActivity } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<'hubs' | 'profile' | 'governance'>('hubs');
  const [links, setLinks] = useState<Link[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hubs, setHubs] = useState<LinkHub[]>([]);
  const [loading, setLoading] = useState(true);

  // User & RBAC state (default to VISITOR on initial mount so session & role are always consistent)
  const [user, setUser] = useState<{ id?: string; email: string; name: string; role?: Role } | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('VISITOR');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [visitorAlert, setVisitorAlert] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedHubIdForCreate, setSelectedHubIdForCreate] = useState<string | undefined>(undefined);
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  const [qrModalLink, setQrModalLink] = useState<Link | null>(null);

  // Check stored user session on mount
  useEffect(() => {
    try {
      const supabaseRaw = localStorage.getItem('linkpulse_supabase_user');
      const raw = localStorage.getItem('linkpulse_user');

      if (supabaseRaw) {
        const su = JSON.parse(supabaseRaw);
        setUser({
          id: su.id,
          name: su.name || su.email.split('@')[0],
          email: su.email,
          role: 'USER'
        });
        setActiveRole('USER');
        logSupabaseActivity(su.id, 'PAGE_VIEW', { path: '/', source: 'supabase_session' });
      } else if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setActiveRole(u.role || 'USER');
        if (u.id) {
          logSupabaseActivity(u.id, 'PAGE_VIEW', { path: '/', source: 'local_session' });
        }
      } else {
        setUser(null);
        setActiveRole('VISITOR');
      }
    } catch {
      setUser(null);
      setActiveRole('VISITOR');
    }
  }, []);

  const handleSignOut = () => {
    if (user?.id) {
      logSupabaseActivity(user.id, 'USER_LOGOUT', { email: user.email });
    }
    localStorage.removeItem('linkpulse_supabase_user');
    localStorage.removeItem('linkpulse_user');
    setUser(null);
    setActiveRole('VISITOR');
    setCurrentView('hubs');
    setLinks([]);
  };

  const handleQuickSignIn = (selectedUser: { id: string; email: string; name: string; role: Role }) => {
    setUser(selectedUser);
    setActiveRole(selectedUser.role);
    try {
      localStorage.setItem('linkpulse_user', JSON.stringify(selectedUser));
    } catch {}
    setCurrentView('hubs');
  };

  const handleRoleChange = (newRole: Role) => {
    setActiveRole(newRole);
    if (newRole === 'VISITOR') {
      localStorage.removeItem('linkpulse_user');
      setUser(null);
      setLinks([]);
      setCurrentView('hubs');
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
      if (currentView === 'governance') {
        setCurrentView('hubs');
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
      // Role-based links fetching: ADMIN gets all, USER gets scoped links, VISITOR gets public only
      const linksUrl = activeRole === 'ADMIN'
        ? '/api/links?role=ADMIN'
        : activeRole === 'USER' && user?.id
        ? `/api/links?userId=${user.id}&role=USER`
        : '/api/links?role=VISITOR';

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
    if (user?.id) {
      logSupabaseActivity(user.id, 'CREATE_LINK', {
        linkId: newLink.id,
        shortCode: newLink.shortCode,
        destinationUrl: newLink.destinationUrl,
        hubId: newLink.hubId || null
      });
    }
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
        body: JSON.stringify({
          isActive: !link.isActive,
          role: activeRole,
          requestingUserId: user?.id
        })
      });
      if (res.ok) {
        if (user?.id) {
          logSupabaseActivity(user.id, 'TOGGLE_LINK_STATUS', {
            linkId: link.id,
            shortCode: link.shortCode,
            newActiveStatus: !link.isActive
          });
        }
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
      const res = await fetch(`/api/links/${link.id}?role=${activeRole}&userId=${user?.id || ''}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (user?.id) {
          logSupabaseActivity(user.id, 'DELETE_LINK', {
            linkId: link.id,
            shortCode: link.shortCode
          });
        }
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

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand (Click to Return Home) */}
          <button
            onClick={() => setCurrentView('hubs')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
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
          </button>

          {/* Action Buttons, RBAC Badge & Theme Switcher */}
          <div className="flex items-center gap-2">
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

            {/* Top Right "Your Profile" Tab Button */}
            <button
              onClick={() => setCurrentView(currentView === 'profile' ? 'hubs' : 'profile')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs ${
                currentView === 'profile'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              }`}
              title="View Your Profile & Activity"
            >
              <div
                className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center uppercase shrink-0 ${
                  currentView === 'profile'
                    ? 'bg-white text-indigo-600'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline">Your Profile</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                  currentView === 'profile'
                    ? 'bg-indigo-700 text-white'
                    : activeRole === 'ADMIN'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                    : activeRole === 'USER'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {activeRole}
              </span>
            </button>

            {user ? (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
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

        {/* VIEW 1: LINK HUBS (Primary Home Page View) */}
        {currentView === 'hubs' && (
          <LinkHubsView
            currentUser={user}
            onOpenCreateLinkModal={(hubId) => handleOpenCreateModal(hubId)}
            onOpenQrModal={(link) => setQrModalLink(link)}
          />
        )}

        {/* VIEW 2: YOUR PROFILE (Profile Overview & Personal Activity Log) */}
        {currentView === 'profile' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Profile Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('hubs')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Link Hubs</span>
                </button>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Your Profile
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Account identity, role credentials, and personal activity log
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Switch Role
                </button>

                {activeRole === 'ADMIN' && (
                  <button
                    onClick={() => setCurrentView('governance')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Governance
                  </button>
                )}

                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                ) : (
                  <a
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </a>
                )}
              </div>
            </div>

            {/* Profile Identity Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-xl flex items-center justify-center uppercase shadow-md shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {user ? user.name : 'Guest Visitor'}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        activeRole === 'ADMIN'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30'
                          : activeRole === 'USER'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {activeRole === 'ADMIN' ? '👑 Platform Admin' : activeRole === 'USER' ? '👤 Verified User' : '🌐 Visitor Mode'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.email || 'Anonymous session — sign in to persist and manage your personal hubs and links'}
                    </p>
                    {user?.id && (
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                        User ID: {user.id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRoleModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    Change Session
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Your Activity Section Inside Profile */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Activity</h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Audit trail of hub visits, access requests, and link actions
                </span>
              </div>
              <ActivityView currentUser={user} />
            </div>
          </div>
        )}

        {/* VIEW 3: GOVERNANCE (For Admin) */}
        {currentView === 'governance' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setCurrentView('profile')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Profile</span>
              </button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Governance & Security Console</h1>
            </div>
            {activeRole === 'ADMIN' ? (
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
            )}
          </div>
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
        userRole={activeRole}
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
