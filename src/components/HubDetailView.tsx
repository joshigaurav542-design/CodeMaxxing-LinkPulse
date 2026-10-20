'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers, ArrowLeft, Plus, Eye, ShieldCheck, UserCheck,
  Globe, ExternalLink, Copy, Check, Trash2, QrCode,
  Users, BarChart2, Sparkles, AlertCircle, Loader2, Lock,
  Clock, Share2
} from 'lucide-react';
import { LinkHub, Link, HubMember, HubRole } from '@/lib/types';
import ShareHubModal from './ShareHubModal';

interface HubDetailViewProps {
  hub: LinkHub;
  currentUser: { id?: string; email: string; name: string } | null;
  onBack: () => void;
  onOpenCreateLinkModal: (hubId: string) => void;
  onOpenQrModal: (link: Link) => void;
  onHubUpdated: () => void;
  onDeleteHub?: (hubId: string) => void;
}

export default function HubDetailView({
  hub,
  currentUser,
  onBack,
  onOpenCreateLinkModal,
  onOpenQrModal,
  onHubUpdated,
  onDeleteHub
}: HubDetailViewProps) {
  const [viewMode, setViewMode] = useState<'visitor' | 'management'>('management');
  const [links, setLinks] = useState<Link[]>([]);
  const [members, setMembers] = useState<HubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [userRole, setUserRole] = useState<HubRole>(hub.currentUserRole || 'VISITOR');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isDeletingHub, setIsDeletingHub] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Fetch hub links & members
  const fetchHubData = async () => {
    try {
      const url = currentUser?.id ? `/api/hubs/${hub.id}?userId=${currentUser.id}` : `/api/hubs/${hub.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLinks(data.links || []);
        setMembers(data.members || []);
        if (data.hub?.currentUserRole) {
          setUserRole(data.hub.currentUserRole);
        }
      }
    } catch (e) {
      console.error('Error fetching hub data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, [hub.id, currentUser?.id]);

  // Log visitor view activity when switching to visitor view
  const handleSwitchToVisitor = async () => {
    setViewMode('visitor');
    if (currentUser?.id) {
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            userName: currentUser.name,
            actionType: 'VISIT_HUB',
            title: 'Viewed Hub as Visitor',
            description: `Previewed "${hub.name}" in Visitor Mode`,
            hubId: hub.id,
            hubName: hub.name
          })
        });
      } catch {}
    }
  };

  // Get User Access handler
  const handleGetUserAccess = async () => {
    if (!currentUser?.id) {
      setActionNotice('Please sign in to request user access to this hub.');
      return;
    }

    setIsJoining(true);
    setActionNotice(null);

    try {
      const res = await fetch(`/api/hubs/${hub.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name
        })
      });

      const data = await res.json();
      if (data.success) {
        setUserRole('CONTRIBUTOR');
        setActionNotice(data.message || 'Access granted! You can now add links to this hub.');
        fetchHubData();
        onHubUpdated();
      } else {
        setActionNotice(data.error || 'Failed to obtain access.');
      }
    } catch {
      setActionNotice('Network error while requesting access.');
    } finally {
      setIsJoining(false);
    }
  };

  // Toggle link active status
  const handleToggleLinkActive = async (link: Link) => {
    if (userRole !== 'ADMIN' && link.createdById !== currentUser?.id) {
      setActionNotice('Only the Hub Admin or link creator can modify this link.');
      return;
    }

    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive })
      });
      if (res.ok) {
        fetchHubData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete link handler
  const handleDeleteLink = async (link: Link) => {
    if (userRole !== 'ADMIN' && link.createdById !== currentUser?.id) {
      setActionNotice('Only the Hub Admin can delete links created by others.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${link.title || link.shortCode}" from this hub?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/links/${link.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHubData();
        onHubUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete hub handler
  const handleDeleteHub = async () => {
    if (userRole !== 'ADMIN') return;
    if (!confirm(`Are you sure you want to delete "${hub.name}"? This will delete all links on this hub.`)) {
      return;
    }

    setIsDeletingHub(true);
    try {
      const res = await fetch(`/api/hubs/${hub.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestingUserId: currentUser?.id })
      });
      if (res.ok) {
        if (onDeleteHub) onDeleteHub(hub.id);
        onBack();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingHub(false);
    }
  };

  const handleCopy = (shortCode: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linkpulse.io';
    navigator.clipboard.writeText(`${origin}/${shortCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isHubAdmin = userRole === 'ADMIN' || hub.adminId === currentUser?.id;
  const hasUserAccess = isHubAdmin || userRole === 'CONTRIBUTOR';

  const filteredLinks = links.filter((l) => {
    if (viewMode === 'visitor' && !l.isActive) return false;
    if (!search) return true;
    return (
      l.shortCode.toLowerCase().includes(search.toLowerCase()) ||
      (l.customAlias && l.customAlias.toLowerCase().includes(search.toLowerCase())) ||
      (l.title && l.title.toLowerCase().includes(search.toLowerCase())) ||
      l.destinationUrl.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Link Hubs</span>
        </button>

        {/* View Mode Toggle: Visitor View vs Management View */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl max-w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setViewMode('management')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'management'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Hub Management
          </button>
          <button
            onClick={handleSwitchToVisitor}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'visitor'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            View as Visitor
          </button>
        </div>
      </div>

      {/* Hub Hero Banner */}
      <div
        className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden"
        style={{
          borderTopWidth: '4px',
          borderTopColor: hub.color || '#6366f1'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {hub.category || 'General Hub'}
              </span>

              {/* Public vs Private Status */}
              {hub.isPublic ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  <Globe className="w-3 h-3" />
                  Public Hub
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  <Lock className="w-3 h-3" />
                  Private Hub
                </span>
              )}

              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                /hub/{hub.slug}
              </span>
              {/* User Relation Badge */}
              {isHubAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Hub Admin
                </span>
              ) : hasUserAccess ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  <UserCheck className="w-3 h-3" />
                  Contributor Access
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Globe className="w-3 h-3" />
                  Visitor
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {hub.name}
            </h1>

            {hub.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {hub.description}
              </p>
            )}

            {/* Admin Info Bar */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Hub Admin:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  👑 {hub.adminName || 'Admin'}
                </span>
              </div>
              <div>•</div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{links.length}</span> links
              </div>
              <div>•</div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{members.length}</span> team members
              </div>
            </div>
          </div>

          {/* Action CTAs based on access */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Share Hub Button (for everyone) */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Share Link Hub"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Share Hub</span>
            </button>

            {!hasUserAccess && (
              <button
                onClick={handleGetUserAccess}
                disabled={isJoining}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Requesting Access...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Get User Access
                  </>
                )}
              </button>
            )}

            {hasUserAccess && (
              <button
                onClick={() => onOpenCreateLinkModal(hub.id)}
                className="px-4 py-2 rounded-xl text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                style={{ backgroundColor: hub.color || '#6366f1' }}
              >
                <Plus className="w-4 h-4" />
                Add Link to Hub
              </button>
            )}

            {isHubAdmin && (
              <button
                onClick={handleDeleteHub}
                disabled={isDeletingHub}
                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-semibold text-xs transition cursor-pointer"
                title="Delete this Link Hub"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Temporary Alert Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs text-indigo-700 dark:text-indigo-300 underline font-medium hover:text-indigo-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VISITOR VIEW MODE */}
      {viewMode === 'visitor' ? (
        <div className="space-y-4">
          {/* Visitor Mode Banner */}
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-sky-900 dark:text-sky-200">
              {hub.isPublic ? (
                <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>
                <strong>Visitor Mode ({hub.isPublic ? 'Public Preview' : 'Private Secret Link'}):</strong>{' '}
                {hub.isPublic
                  ? 'You are previewing active links on this public hub. Anyone can browse, click links, or request contributor access.'
                  : 'You have accessed this private hub via a direct share link. Visitors can explore links or sign in to request contributor access.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3 h-3 text-indigo-500" />
                Share
              </button>
              {!hasUserAccess && (
                <button
                  onClick={handleGetUserAccess}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                >
                  Get User Access
                </button>
              )}
            </div>
          </div>

          {/* Links Grid for Visitors */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading hub links...</div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active links in this hub yet</h4>
              <p className="text-xs text-slate-400">Links will appear here once added by the hub admin or contributors.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredLinks.map((link) => {
                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linkpulse.io';
                const shortUrl = `${origin}/${link.shortCode}`;

                return (
                  <div
                    key={link.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
                          /{link.shortCode}
                        </span>
                        {link.hasPassword && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <Lock className="w-2.5 h-2.5" /> Password
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {link.title || link.shortCode}
                      </h3>

                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 font-mono">
                        {link.destinationUrl}
                      </p>
                    </div>

                    {/* Bottom Actions for Visitors */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{link.clickCount || 0}</span> clicks
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(link.shortCode, link.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Copy shortlink"
                        >
                          {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onOpenQrModal(link)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Generate QR code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MANAGEMENT & COLLABORATION MODE */
        <div className="space-y-5">
          {/* Access Status Guidance Card */}
          {isHubAdmin ? (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Hub Administrator Controls
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    You control this link hub. You can add links, toggle active status, and remove any link on this hub.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenCreateLinkModal(hub.id)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                + Add Link to Hub
              </button>
            </div>
          ) : hasUserAccess ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Contributor Access Enabled
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    You have User Access to this hub. You can add new links and collaborate with the hub admin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenCreateLinkModal(hub.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                + Add Link to Hub
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Visitor Access Only
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    To add links to this hub, request User Access below. Once granted, you can create and manage links on this hub.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGetUserAccess}
                disabled={isJoining}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Get User Access
              </button>
            </div>
          )}

          {/* Links Management Table / Card List */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Hub Links ({links.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isHubAdmin ? 'Full admin rights to toggle or remove any link' : 'Links published in this hub'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="hub-detail-search" className="sr-only">Filter hub links</label>
                <input
                  id="hub-detail-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter hub links..."
                  aria-label="Filter hub links"
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {hasUserAccess && (
                  <button
                    onClick={() => onOpenCreateLinkModal(hub.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Link
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Loading links...</div>
            ) : filteredLinks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No links in this hub yet.
                </p>
                {hasUserAccess ? (
                  <button
                    onClick={() => onOpenCreateLinkModal(hub.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Create the First Link
                  </button>
                ) : (
                  <button
                    onClick={handleGetUserAccess}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Get User Access to Add Links
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLinks.map((link) => {
                  const isOwner = link.createdById === currentUser?.id;
                  const canManage = isHubAdmin || isOwner;

                  return (
                    <div
                      key={link.id}
                      className="p-4 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            /{link.shortCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              link.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200'
                            }`}
                          >
                            {link.isActive ? 'Active' : 'Disabled'}
                          </span>
                          {isOwner && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                              Your Link
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {link.title || link.shortCode}
                        </h4>

                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                          {link.destinationUrl}
                        </p>
                      </div>

                      {/* Controls on Right */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right pr-2">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            {link.clickCount || 0}
                          </div>
                          <div className="text-[10px] text-slate-400">clicks</div>
                        </div>

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleToggleLinkActive(link)}
                            title={link.isActive ? 'Disable link' : 'Enable link'}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              link.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                link.isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        )}

                        <button
                          onClick={() => handleCopy(link.shortCode, link.id)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            copiedId === link.id
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-500/30 px-2'
                              : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={copiedId === link.id ? 'Copied to clipboard!' : 'Copy Link'}
                          aria-label={copiedId === link.id ? 'Copied link to clipboard' : 'Copy link'}
                        >
                          {copiedId === link.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onOpenQrModal(link)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {canManage && (
                          <button
                            onClick={() => handleDeleteLink(link)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            title="Delete link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members / Contributors List */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                  Hub Collaborators & Access List ({members.length})
                </h3>
              </div>
              {!hasUserAccess && (
                <button
                  onClick={handleGetUserAccess}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Join Hub Team
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-semibold flex items-center justify-center shrink-0 uppercase">
                      {m.userName?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {m.userName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {m.userEmail || 'Member'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                      m.role === 'ADMIN'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    }`}
                  >
                    {m.role === 'ADMIN' ? '👑 Admin' : 'Contributor'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Hub Modal */}
      {isShareModalOpen && (
        <ShareHubModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          hub={hub}
        />
      )}
    </div>
  );
}
