'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, Shield, Bot, Globe, Smartphone,
  RefreshCw, MousePointerClick, ArrowUpRight
} from 'lucide-react';

interface AnalyticsData {
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  uniqueVisitors: number;
  timeSeries: Array<{ date: string; clicks: number; humanClicks: number }>;
  countries: Array<{ country: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  os: Array<{ os: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
}

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AnalyticsView({ linkId }: { linkId?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    window.addEventListener('theme-change', checkDark);
    return () => window.removeEventListener('theme-change', checkDark);
  }, []);

  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const url = linkId ? `/api/analytics?linkId=${linkId}` : '/api/analytics';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.analytics);
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [linkId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
        <span className="text-xs">Loading analytics...</span>
      </div>
    );
  }

  const botPercentage = data.totalClicks > 0 ? ((data.botClicks / data.totalClicks) * 100).toFixed(1) : '0';
  const humanPercentage = data.totalClicks > 0 ? ((data.humanClicks / data.totalClicks) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-5">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Clicks */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Clicks</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.totalClicks.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">100%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Total link interactions</p>
        </div>

        {/* Card 2: Human Visitors */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Human Clicks</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.humanClicks.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{humanPercentage}%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verified human traffic</p>
        </div>

        {/* Card 3: Unique Visitors */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Unique Visitors</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.uniqueVisitors.toLocaleString()}
            </span>
            <span className="text-xs text-sky-600 dark:text-blue-400 font-medium">Hashed</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Distinct IP addresses</p>
        </div>

        {/* Card 4: Filtered Bots */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Filtered Bots</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {data.botClicks.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{botPercentage}%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Crawlers & scrapers</p>
        </div>
      </div>

      {/* Main Time-Series Area Chart */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Click Trajectory Over Time
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Telemetry event stream</p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={isDark ? 0.35 : 0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="humanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.35 : 0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#clickGradient)" name="Total Traffic" />
              <Area type="monotone" dataKey="humanClicks" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#humanGradient)" name="Human Verified" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Geographic Distribution & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic Breakdown */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3.5">
            <Globe className="w-4 h-4 text-sky-500" />
            Geographic Distribution
          </h3>
          <div className="space-y-2.5">
            {data.countries.slice(0, 6).map((c, idx) => {
              const max = data.countries[0]?.count || 1;
              const pct = ((c.count / max) * 100).toFixed(0);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{c.country}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{c.count.toLocaleString()} visits</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Client Breakdown */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3.5">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            Device Breakdown
          </h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.devices}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {data.devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-1">
            {data.devices.map((d, i) => (
              <div key={d.device} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-600 dark:text-slate-300 capitalize text-[11px]">{d.device}: {d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrer Attribution */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Top Acquisition Sources
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {data.referrers.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-700 dark:text-indigo-300 truncate max-w-[180px]">{r.referrer}</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-white bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
