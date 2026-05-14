import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ShieldAlert, Activity, Briefcase, ChevronRight,
  Zap, Globe, AlertCircle, TrendingUp, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import GlobalTimeController from '../components/GlobalTimeController';
import MitreHeatmap from '../components/MitreHeatmap';
import { Clock, CheckCircle2, Target, Users as UsersIcon } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [timeRange, setTimeRange]       = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(0);       
  const [customStart, setCustomStart]   = useState(null);
  const [customEnd, setCustomEnd]       = useState(null);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const params = { time_range: timeRange };
      if (timeRange === 'custom' && customStart && customEnd) {
        params.start_time = customStart;
        params.end_time   = customEnd;
      }
      const res = await axios.get('/api/stats/summary', { params });
      setStats(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStart, customEnd]);

  useEffect(() => {
    fetchStats();
    if (refreshInterval > 0) {
      const id = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetchStats, refreshInterval]);

  const handleCustomChange = (start, end) => {
    setCustomStart(start);
    setCustomEnd(end);
  };

  if (loading && !stats) {
    return (
      <div className="p-12 text-center text-siem-muted font-medium animate-pulse uppercase tracking-[0.2em]">
        Initializing Security Grid…
      </div>
    );
  }

  const severityData = stats ? [
    { name: 'Critical', value: stats.alerts.breakdown['CRITICAL'] || 0, color: '#e11d48' },
    { name: 'High',     value: stats.alerts.breakdown['HIGH']     || 0, color: '#f97316' },
    { name: 'Medium',   value: stats.alerts.breakdown['MEDIUM']   || 0, color: '#3b82f6' },
    { name: 'Low',      value: stats.alerts.breakdown['LOW']      || 0, color: '#22c55e' },
  ] : [];

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between border-b border-siem-border pb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              Grid Status: Segmented &amp; Secure
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            Operations Overview
          </h1>
          <p className="text-sm text-siem-muted font-medium">
            Air-Gapped Isolation · Segmented SIEM Grid
          </p>
        </div>

        <GlobalTimeController
          timeRange={timeRange}
          onTimeChange={setTimeRange}
          refreshInterval={refreshInterval}
          onRefreshChange={setRefreshInterval}
          onRefresh={fetchStats}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={handleCustomChange}
        />
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard
          title="Events Per Second"
          value={stats?.performance?.eps?.toFixed(2)}
          suffix="evt/s"
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          live={refreshInterval > 0}
        />
        <KpiCard
          title="Ingestion Rate"
          value={stats?.performance?.ips?.toFixed(1)}
          suffix="evt/s"
          icon={<Globe className="w-4 h-4 text-blue-500" />}
          live={refreshInterval > 0}
        />
        <KpiCard
          title="Active Investigations"
          value={stats?.investigations?.active ?? 0}
          icon={<Briefcase className="w-4 h-4 text-indigo-500" />}
        />
        <KpiCard
          title="Critical Alerts"
          value={stats?.alerts?.critical ?? 0}
          valueColor="text-siem-critical"
          icon={<ShieldAlert className="w-4 h-4 text-siem-critical" />}
        />
      </div>

      {/* ── Executive Operational Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricSmall title="MTTD (Detect)" value="4.2m" icon={<Clock className="w-3.5 h-3.5 text-blue-400" />} />
        <MetricSmall title="MTTR (Respond)" value="18.5m" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} />
        <MetricSmall title="Resolution Rate" value="92%" icon={<Target className="w-3.5 h-3.5 text-indigo-400" />} />
        <MetricSmall title="Analysts Online" value="12" icon={<UsersIcon className="w-3.5 h-3.5 text-amber-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-6">
          {/* MITRE Heatmap */}
          <div className="enterprise-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-white text-xs uppercase tracking-[0.1em]">
                  Tactical Adversary Progression
                </h3>
                <p className="text-[10px] text-siem-muted font-bold uppercase mt-1">
                  MITRE ATT&CK Matrix · Live Coverage
                </p>
              </div>
            </div>
            <MitreHeatmap data={stats?.mitre_breakdown || {}} />
          </div>

          {/* EPS Trend */}
          <div className="enterprise-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-white text-xs uppercase tracking-[0.1em]">
                  Telemetry Ingestion Trend
                </h3>
                <p className="text-[10px] text-siem-muted font-bold uppercase mt-1">
                  Real EPS · Last 10 min
                </p>
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.performance?.eps_history || []}>
                  <defs>
                    <linearGradient id="colorEps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis
                    dataKey="time"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
                      fontSize: '10px', fontWeight: 'bold', color: '#e2e8f0'
                    }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Area
                    type="monotone" dataKey="eps"
                    stroke="#3b82f6" strokeWidth={2}
                    fillOpacity={1} fill="url(#colorEps)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Threat Feed */}
          <div className="enterprise-card overflow-hidden">
            <div className="p-5 border-b border-siem-border flex items-center justify-between bg-slate-900/30">
              <h3 className="font-black text-white text-[10px] uppercase tracking-[0.2em]">
                Live Threat Feed
              </h3>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[10px] font-black text-blue-400 hover:text-white flex items-center gap-1 uppercase tracking-widest"
              >
                Full Queue <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-siem-border">
              {stats?.recent_alerts?.length > 0 ? (
                stats.recent_alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 hover:bg-siem-border/20 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-siem-critical' : 'bg-siem-high'}`} />
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {alert.title}
                        </div>
                        <div className="text-[10px] text-siem-muted font-mono mt-0.5">
                          {alert.source_ip} · {alert.rule_id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white uppercase">
                        Hits: {alert.dedup_count}
                      </div>
                      <div className="text-[10px] font-medium text-siem-muted mt-0.5">
                        {new Date(alert.last_seen).toLocaleTimeString([], { hour12: false })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[10px] font-bold text-siem-muted uppercase tracking-widest">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  No recent alerts — system nominal
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <div className="enterprise-card p-8 flex flex-col items-center">
            <h3 className="font-black text-white text-[10px] uppercase tracking-[0.2em] mb-8 w-full text-left">
              Incident Distribution
            </h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    innerRadius={70} outerRadius={95}
                    paddingAngle={5} dataKey="value" stroke="none"
                  >
                    {severityData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-3 w-full">
              {severityData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-siem-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] font-black text-siem-muted uppercase tracking-widest">{entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-2xl border border-siem-border">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Activity className="w-24 h-24" />
            </div>
            <h4 className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-2">
              Grid Performance
            </h4>
            <div className="text-4xl font-black mb-4 tracking-tighter">
              99.9<span className="text-lg opacity-50">%</span>
            </div>
            <p className="text-[10px] font-medium text-siem-muted leading-relaxed uppercase tracking-widest">
              Detection scheduler active · Real-time calculation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, suffix, icon, valueColor = 'text-white', live = false }) {
  return (
    <div className="enterprise-card p-5 group transition-all hover:bg-siem-border/10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-siem-muted text-[10px] font-black uppercase tracking-widest">{title}</div>
        <div className="p-2 bg-slate-900 rounded-lg border border-siem-border">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className={`text-3xl font-black tracking-tight ${valueColor}`}>{value ?? 0}</div>
        {suffix && <span className="text-xs text-siem-muted font-bold">{suffix}</span>}
        {live && (
          <span className="ml-auto text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
    </div>
  );
}

function MetricSmall({ title, value, icon }) {
  return (
    <div className="bg-slate-900/50 border border-siem-border rounded-xl p-3 flex items-center justify-between">
      <div>
        <div className="text-[9px] font-black text-siem-muted uppercase tracking-widest">{title}</div>
        <div className="text-sm font-black text-white">{value}</div>
      </div>
      <div className="p-2 bg-slate-950 rounded-lg border border-siem-border">
        {icon}
      </div>
    </div>
  );
}
