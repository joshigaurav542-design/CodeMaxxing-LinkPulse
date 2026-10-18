'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, Shield, Bot, Globe, Smartphone,
  RefreshCw, MousePointerClick, Laptop, Tablet, ArrowUpRight
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

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function AnalyticsView({ linkId }: { linkId?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      <div className="flex items-center justify-center min-h-[350px] text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
        <span>Aggregating real-time telemetry...</span>
      </div>
    );
  }

  // Calculate percentages
  const botPercentage = data.totalClicks > 0 ? ((data.botClicks / data.totalClicks) * 100).toFixed(1) : '0';
  const humanPercentage = data.totalClicks > 0 ? ((data.humanClicks / data.totalClicks) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Telemetry Clicks */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Raw Clicks</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{data.totalClicks.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-0.5" /> 100%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Zero-latency sub-50ms captures</p>
        </div>

        {/* Card 2: Verified Human Visitors */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Human Clicks</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{data.humanClicks.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">{humanPercentage}% human</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Filtered through crawler verification</p>
        </div>

        {/* Card 3: Unique Visitors (Salted SHA-256) */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Unique Visitors</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{data.uniqueVisitors.toLocaleString()}</span>
            <span className="text-xs text-blue-400 font-medium">GDPR Salted</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Daily cryptographic IP hashes</p>
        </div>

        {/* Card 4: Bot & Crawler Filtration */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Filtered Bots</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400 tracking-tight">{data.botClicks.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">{botPercentage}% filtered</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">RFC crawler & scraper isolation</p>
        </div>
      </div>

      {/* Main Time-Series Area Chart */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Real-Time Click Velocity & Trajectory
            </h3>
            <p className="text-xs text-slate-400">Continuous non-blocking event telemetry stream</p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh Feed
          </button>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="humanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#clickGradient)" name="Total Traffic" />
              <Area type="monotone" dataKey="humanClicks" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#humanGradient)" name="Human Verified" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Geographic Distribution & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-blue-400" />
            Geographic Audience Footprint
          </h3>
          <div className="space-y-3">
            {data.countries.slice(0, 6).map((c, idx) => {
              const max = data.countries[0]?.count || 1;
              const pct = ((c.count / max) * 100).toFixed(0);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{c.country}</span>
                    <span className="font-mono text-slate-400">{c.count.toLocaleString()} visits</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Client Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Device & Platform Distribution
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.devices}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {data.devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs mt-2">
            {data.devices.map((d, i) => (
              <div key={d.device} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-300 capitalize">{d.device}: {d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrer Attribution */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          Acquisition Channels & Top Referrers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.referrers.map((r, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-300 truncate max-w-[180px]">{r.referrer}</span>
              <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
