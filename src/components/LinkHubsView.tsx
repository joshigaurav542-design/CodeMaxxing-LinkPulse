'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Search, ShieldCheck, UserCheck, Globe,
  Eye, ArrowRight, Sparkles, Filter, Users, Link2, Loader2,
  Lock, Share2, Check, AlertTriangle, RotateCcw, SearchX, Clock
} from 'lucide-react';
import { LinkHub, Link, HubRole } from '@/lib/types';
import HubDetailView from './HubDetailView';
import CreateHubModal from './CreateHubModal';
import ShareHubModal from './ShareHubModal';

interface LinkHubsViewProps {
  currentUser: { id?: string; email: string; name: string } | null;
  onOpenCreateLinkModal: (hubId?: string) => void;
  onOpenQrModal: (link: Link) => void;
}

export default function LinkHubsView({
  currentUser,
  onOpenCreateLinkModal,
  onOpenQrModal
}: LinkHubsViewProps) {
  const [hubs, setHubs] = useState<LinkHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);
  const [selectedHub, setSelectedHub] = useState<LinkHub | null>(null);
  const [initialViewMode, setInitialViewMode] = useState<'visitor' | 'management'>('management');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my-hubs' | 'joined'>('all');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false);
  const [joiningHubId, setJoiningHubId] = useState<string | null>(null);
  const [sharingHub, setSharingHub] = useState<LinkHub | null>(null);

  const fetchHubs = async () => {
    setLoading(true);
    setError(null);
    setIsTimeout(false);

    // Timeout after 8 seconds to prevent requests that never finish
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 8000);

    try {
      const url = currentUser?.id ? `/api/hubs?userId=${currentUser.id}` : '/api/hubs';
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Failed to fetch'}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load link hubs');
      }

      setHubs(data.hubs || []);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsTimeout(true);
        setError('The request timed out while loading link hubs. The server took too long to respond.');
      } else {
        setError(err.message || 'Unable to load link hubs. Please check your network connection.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubs();

    // Check if user visited via a direct share link (?hub=slug or ?hubId=id)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hubParam = params.get('hub') || params.get('hubId');
      if (hubParam) {
        const fetchDirectHub = async () => {
          try {
            const res = await fetch(`/api/hubs/${hubParam}?userId=${currentUser?.id || ''}`);
            const data = await res.json();
            if (data.success && data.hub) {
              setSelectedHub(data.hub);
              setInitialViewMode('visitor');
            }
          } catch (err) {
            console.error('Failed to load direct hub link', err);
          }
        };
        fetchDirectHub();
      }
    }
  }, [currentUser?.id]);

  const handleHubCreated = (newHub: LinkHub) => {
    setHubs((prev) => [newHub, ...prev]);
    setSelectedHub(newHub);
  };

  const handleOpenHub = (hub: LinkHub, mode: 'visitor' | 'management') => {
    setInitialViewMode(mode);
    setSelectedHub(hub);
  };

  const handleQuickJoin = async (e: React.MouseEvent, hub: LinkHub) => {
    e.stopPropagation();
    if (!currentUser?.id) return;

    setJoiningHubId(hub.id);
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
        fetchHubs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJoiningHubId(null);
    }
  };

  // Filtered Hubs
  const filteredHubs = hubs.filter((hub) => {
    if (activeFilter === 'my-hubs') {
      if (hub.adminId !== currentUser?.id) return false;
    } else if (activeFilter === 'joined') {
      if (hub.currentUserRole !== 'CONTRIBUTOR') return false;
    }

    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Other') {
        const standardList = ['Travel & Exploration', 'Technology & Development', 'Hackathon & Tech', 'Marketing & Sales', 'Developer Tools', 'Education & Learning', 'Finance & Productivity', 'Health & Fitness', 'Product Launches', 'Community & Social', 'Design & Creative', 'General'];
        const isStandard = standardList.includes(hub.category);
        if (isStandard && hub.category !== 'Other') return false;
      } else if (hub.category !== selectedCategory) {
        return false;
      }
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      hub.name.toLowerCase().includes(q) ||
      hub.slug.toLowerCase().includes(q) ||
      (hub.description && hub.description.toLowerCase().includes(q)) ||
      hub.adminName.toLowerCase().includes(q) ||
      hub.category.toLowerCase().includes(q)
    );
  });

  const knownCategories = [
    'Travel & Exploration',
    'Technology & Development',
    'Health & Fitness',
    'Education & Learning',
    'Finance & Productivity',
    'Hackathon & Tech',
    'Marketing & Sales',
    'Developer Tools'
  ];
  const dynamicCategories = Array.from(new Set(hubs.map((h) => h.category).filter(Boolean)));
  const combinedCategories = Array.from(new Set([
    ...knownCategories,
    ...dynamicCategories.filter((c) => c !== 'Other')
  ]));
  const categories = ['All', ...combinedCategories, 'Other'];

  const getCategoryCount = (c: string) => {
    if (c === 'All') return hubs.length;
    if (c === 'Other') {
      return hubs.filter(
        (h) => !h.category || h.category === 'Other' || !['Travel & Exploration', 'Technology & Development', 'Health & Fitness', 'Education & Learning', 'Finance & Productivity', 'Hackathon & Tech', 'Marketing & Sales', 'Developer Tools', 'Product Launches', 'Community & Social', 'Design & Creative', 'General'].includes(h.category)
      ).length;
    }
    return hubs.filter((h) => h.category === c).length;
  };

  // If a hub is actively selected, show its detail view!
  if (selectedHub) {
    return (
      <HubDetailView
        hub={selectedHub}
        currentUser={currentUser}
        onBack={() => {
          setSelectedHub(null);
          fetchHubs();
        }}
        onOpenCreateLinkModal={(hubId) => onOpenCreateLinkModal(hubId)}
        onOpenQrModal={onOpenQrModal}
        onHubUpdated={fetchHubs}
        onDeleteHub={() => {
          setSelectedHub(null);
          fetchHubs();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Link Hubs
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
              {hubs.length} Hubs Available
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Each link hub has an admin who controls links on that hub. View as visitor or get user access to collaborate.
          </p>
        </div>

        <button
          onClick={() => setIsCreateHubOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Link Hub
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs: All / My Hubs / Joined */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl max-w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Hubs</span>
            {loading ? (
              <span className="w-4 h-3 rounded bg-slate-300 dark:bg-slate-700 animate-pulse ml-0.5 inline-block" />
            ) : (
              <span>({hubs.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('my-hubs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeFilter === 'my-hubs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>My Managed Hubs</span>
            {loading ? (
              <span className="w-4 h-3 rounded bg-slate-300 dark:bg-slate-700 animate-pulse ml-0.5 inline-block" />
            ) : (
              <span>({hubs.filter((h) => h.adminId === currentUser?.id).length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('joined')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeFilter === 'joined'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Joined Hubs</span>
            {loading ? (
              <span className="w-4 h-3 rounded bg-slate-300 dark:bg-slate-700 animate-pulse ml-0.5 inline-block" />
            ) : (
              <span>({hubs.filter((h) => h.currentUserRole === 'CONTRIBUTOR').length})</span>
            )}
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <label htmlFor="hub-search-input" className="sr-only">Search hubs</label>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="hub-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hubs..."
              aria-label="Search hubs"
              className="pl-8 pr-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {categories.length > 2 && (
            <div>
              <label htmlFor="hub-category-filter" className="sr-only">Filter by category</label>
              <select
                id="hub-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by category"
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Category Scrollbar Bar with Check Indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 custom-scrollbar">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 pl-0.5">
          <Filter className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Category:</span>
        </div>
        {categories.map((c) => {
          const isSelected = selectedCategory === c;
          const count = getCategoryCount(c);

          return (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border shadow-2xs ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Check indicator box */}
              <span
                className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-white text-indigo-600 border-white'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>

              <span>{c === 'All' ? 'All Categories' : c}</span>

              {/* Count badge */}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold transition-all min-w-[20px] text-center ${
                  isSelected
                    ? 'bg-indigo-700/80 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {loading ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse inline-block align-middle" />
                ) : (
                  count
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error & Timeout Recovery State */}
      {error && !loading ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900/60 border border-rose-200 dark:border-rose-900/40 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200/60 dark:border-rose-500/20">
            {isTimeout ? (
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {isTimeout ? 'Request Timed Out' : 'Unable to load link hubs'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => fetchHubs()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Now
            </button>
            <button
              onClick={() => {
                setError(null);
                setIsTimeout(false);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : loading ? (
        /* Skeleton Grid while fetching data */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 animate-pulse"
            >
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>

              {/* Title & Description skeleton */}
              <div className="space-y-2">
                <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-3.5 w-3/5 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>

              {/* Stats & divider skeleton */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </div>

              {/* Buttons skeleton */}
              <div className="pt-2 flex items-center gap-2">
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : hubs.length === 0 ? (
        /* Empty State: When successful request returns zero hubs */
        <div className="p-14 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60 dark:border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No link hubs yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Link Hubs organize links into shared workspaces with role-based access. Create your first hub to start collaborating!
            </p>
          </div>
          <button
            onClick={() => setIsCreateHubOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Link Hub
          </button>
        </div>
      ) : filteredHubs.length === 0 ? (
        /* Empty Filter State: When hubs exist, but current search/filter yields zero */
        <div className="p-14 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <SearchX className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No matching hubs found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {activeFilter === 'my-hubs'
                ? "You haven't created any link hubs in this view yet."
                : activeFilter === 'joined'
                ? "You haven't joined any link hubs as a contributor yet."
                : search.trim()
                ? `No link hubs found matching "${search}". Try clearing your search or category filter.`
                : 'Try adjusting your category filter to find what you are looking for.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {(search || selectedCategory !== 'All' || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setActiveFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setIsCreateHubOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Link Hub
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHubs.map((hub) => {
            const isHubAdmin = hub.adminId === currentUser?.id || hub.currentUserRole === 'ADMIN';
            const hasUserAccess = isHubAdmin || hub.currentUserRole === 'CONTRIBUTOR';

            return (
              <div
                key={hub.id}
                onClick={() => handleOpenHub(hub, 'management')}
                className="group relative p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 overflow-hidden"
              >
                {/* Accent Top Bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
                  style={{ backgroundColor: hub.color || '#6366f1' }}
                />

                <div className="space-y-2.5 pt-1">
                  {/* Category & Role Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {hub.category || 'General'}
                      </span>
                      {hub.isPublic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      )}
                    </div>

                    {/* Role Status Tag */}
                    {isHubAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                        <ShieldCheck className="w-2.5 h-2.5" /> Hub Admin
                      </span>
                    ) : hasUserAccess ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                        <UserCheck className="w-2.5 h-2.5" /> Contributor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <Globe className="w-2.5 h-2.5" /> Visitor
                      </span>
                    )}
                  </div>

                  {/* Hub Title & Description */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {hub.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      /hub/{hub.slug}
                    </p>
                  </div>

                  {hub.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {hub.description}
                    </p>
                  )}

                  {/* Admin Tag */}
                  <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] text-slate-400">Admin:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      👑 {hub.adminName || 'Admin'}
                    </span>
                  </div>
                </div>

                {/* Bottom Stats & CTAs */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 font-medium">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{hub.linkCount || 0} links</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{hub.membersCount || 0} members</span>
                    </div>
                  </div>

                  {/* Action Buttons on Card */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingHub(hub);
                      }}
                      className="p-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Share Link Hub"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="hidden sm:inline text-[11px]">Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenHub(hub, 'visitor');
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View</span>
                    </button>

                    {!hasUserAccess ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickJoin(e, hub)}
                        disabled={joiningHubId === hub.id}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                      >
                        {joiningHubId === hub.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Get Access</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenHub(hub, 'management')}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating Hub */}
      {isCreateHubOpen && currentUser && (
        <CreateHubModal
          isOpen={isCreateHubOpen}
          onClose={() => setIsCreateHubOpen(false)}
          onHubCreated={handleHubCreated}
          userId={currentUser.id || 'usr-admin-001'}
          userName={currentUser.name}
          userEmail={currentUser.email}
        />
      )}

      {/* Share Hub Modal */}
      {sharingHub && (
        <ShareHubModal
          isOpen={!!sharingHub}
          onClose={() => setSharingHub(null)}
          hub={sharingHub}
        />
      )}
    </div>
  );
}
