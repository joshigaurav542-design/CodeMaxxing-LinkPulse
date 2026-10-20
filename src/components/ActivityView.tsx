'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, Layers, Link2, Sparkles, UserCheck, ShieldCheck,
  Trash2, Eye, RefreshCw, Clock, Filter, CheckCircle2, Zap, Database
} from 'lucide-react';
import { UserActivity, ActivityActionType } from '@/lib/types';
import { fetchSupabaseUserActivities } from '@/lib/supabaseClient';

interface ActivityViewProps {
  currentUser: { id?: string; email: string; name: string } | null;
}

export default function ActivityView({ currentUser }: ActivityViewProps) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hubs' | 'links' | 'access' | 'supabase'>('all');
  const [search, setSearch] = useState('');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const url = currentUser?.id ? `/api/activity?userId=${currentUser.id}` : '/api/activity';
      const [res, supabaseLogs] = await Promise.all([
        fetch(url).then((r) => r.json()).catch(() => ({ success: false, activities: [] })),
        currentUser?.id ? fetchSupabaseUserActivities(currentUser.id, 30) : Promise.resolve([])
      ]);

      const localList: UserActivity[] = res.success ? res.activities || [] : [];

      // Map Supabase logs to UserActivity format
      const supabaseMapped: UserActivity[] = supabaseLogs.map((log) => ({
        id: `sb-${log.id}`,
        userId: log.user_id,
        userName: currentUser?.name || 'Identified User',
        actionType: (log.action as ActivityActionType) || 'PAGE_VIEW',
        title: log.action.replace(/_/g, ' '),
        description: log.metadata?.page || log.metadata?.path || log.metadata?.url
          ? `Event on ${log.metadata.page || log.metadata.path || log.metadata.url}`
          : `Supabase logged: ${log.action}`,
        createdAt: log.timestamp
      }));

      // Combine and sort chronologically
      const combined = [...localList, ...supabaseMapped].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Deduplicate by ID
      const seen = new Set<string>();
      const deduplicated = combined.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setActivities(deduplicated);
    } catch (e) {
      console.error('Error fetching activities', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [currentUser?.id]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getActionBadge = (action: ActivityActionType) => {
    switch (action) {
      case 'CREATE_HUB':
        return {
          icon: Layers,
          color: 'bg-indigo-500 text-white',
          textColor: 'text-indigo-600 dark:text-indigo-400',
          bgSoft: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
          label: 'Hub Created'
        };
      case 'JOIN_HUB':
        return {
          icon: UserCheck,
          color: 'bg-emerald-500 text-white',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          bgSoft: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
          label: 'User Access Gained'
        };
      case 'ADD_LINK':
        return {
          icon: Link2,
          color: 'bg-blue-500 text-white',
          textColor: 'text-blue-600 dark:text-blue-400',
          bgSoft: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
          label: 'Link Added'
        };
      case 'DELETE_LINK':
        return {
          icon: Trash2,
          color: 'bg-rose-500 text-white',
          textColor: 'text-rose-600 dark:text-rose-400',
          bgSoft: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
          label: 'Deleted'
        };
      case 'TOGGLE_LINK':
        return {
          icon: Zap,
          color: 'bg-amber-500 text-white',
          textColor: 'text-amber-600 dark:text-amber-400',
          bgSoft: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
          label: 'Status Changed'
        };
      case 'VISIT_HUB':
        return {
          icon: Eye,
          color: 'bg-sky-500 text-white',
          textColor: 'text-sky-600 dark:text-sky-400',
          bgSoft: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
          label: 'Visitor Preview'
        };
      default:
        return {
          icon: Sparkles,
          color: 'bg-slate-500 text-white',
          textColor: 'text-slate-600 dark:text-slate-400',
          bgSoft: 'bg-slate-100 dark:bg-slate-800 border-slate-200',
          label: 'Activity'
        };
    }
  };

  const filteredActivities = activities.filter((act) => {
    if (filter === 'hubs') {
      if (act.actionType !== 'CREATE_HUB') return false;
    } else if (filter === 'links') {
      if (act.actionType !== 'ADD_LINK' && act.actionType !== 'DELETE_LINK' && act.actionType !== 'TOGGLE_LINK') return false;
    } else if (filter === 'access') {
      if (act.actionType !== 'JOIN_HUB') return false;
    } else if (filter === 'supabase') {
      if (!act.id.startsWith('sb-')) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q) ||
      (act.hubName && act.hubName.toLowerCase().includes(q)) ||
      (act.linkTitle && act.linkTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Your Activity Log
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
              {activities.length} Recorded Actions
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Supabase Synced</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time chronological timeline of your Link Hub creations, access grants, link additions, and actions.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Chips & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl max-w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Actions ({activities.length})
          </button>

          <button
            onClick={() => setFilter('supabase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              filter === 'supabase'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Cloud Logs ({activities.filter((a) => a.id.startsWith('sb-')).length})</span>
          </button>
          <button
            onClick={() => setFilter('hubs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'hubs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Hubs ({activities.filter((a) => a.actionType === 'CREATE_HUB').length})
          </button>
          <button
            onClick={() => setFilter('links')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'links'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Links ({activities.filter((a) => ['ADD_LINK', 'DELETE_LINK', 'TOGGLE_LINK'].includes(a.actionType)).length})
          </button>
          <button
            onClick={() => setFilter('access')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filter === 'access'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Access ({activities.filter((a) => a.actionType === 'JOIN_HUB').length})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter activity history..."
          className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {/* Timeline Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading activity timeline...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No activity matching this filter
            </h4>
            <p className="text-xs text-slate-400">
              Actions you take such as creating a hub, gaining access, or adding links will appear here.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-7 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {filteredActivities.map((act) => {
              const badge = getActionBadge(act.actionType);
              const IconComp = badge.icon;

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 shadow-xs ${badge.color}`}
                  >
                    <IconComp className="w-3 h-3" />
                  </div>

                  {/* Activity Details Card */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bgSoft} ${badge.textColor}`}
                        >
                          {badge.label}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {act.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(act.createdAt)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {act.description}
                    </p>

                    {/* Metadata Context Badges */}
                    {(act.hubName || act.linkTitle) && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {act.hubName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200/60 dark:border-indigo-500/20">
                            <Layers className="w-2.5 h-2.5" />
                            {act.hubName}
                          </span>
                        )}
                        {act.linkTitle && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                            <Link2 className="w-2.5 h-2.5" />
                            {act.linkTitle}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
