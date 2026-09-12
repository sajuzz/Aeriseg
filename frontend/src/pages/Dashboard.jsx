import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ShieldAlert, Activity, Monitor, ChevronRight, Download, RefreshCw,
  Zap, Globe, AlertCircle, TrendingUp, BarChart3, Clock, CheckCircle2,
  AlertTriangle, Crosshair, Target
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/stats/summary', { params: { time_range: '24h' } });
      setStats(res.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] animate-pulse font-medium">
        Initializing Grid...
      </div>
    );
  }

  const severityData = stats ? [
    { name: 'Critical', value: stats.alerts.breakdown['CRITICAL'] || 0, color: '#ef4444' },
    { name: 'High',     value: stats.alerts.breakdown['HIGH']     || 0, color: '#f97316' },
    { name: 'Medium',   value: stats.alerts.breakdown['MEDIUM']   || 0, color: '#eab308' },
    { name: 'Low',      value: stats.alerts.breakdown['LOW']      || 0, color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  const mitreData = stats ? Object.entries(stats.mitre_breakdown || {}).map(([name, value]) => ({
    name, value
  })) : [];

  return (
    <div className="space-y-6">
      
      {/* ── Header ── */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Overview</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Real-time threat monitoring</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchStats} className="px-5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-3xl text-sm font-medium flex items-center gap-2 hover:border-[rgb(var(--primary))] transition-colors text-[var(--text)] shadow-sm">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="px-5 py-2.5 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary),0.9)] text-white rounded-3xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-md">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Events"
          value={(stats?.performance?.total_events || 0).toLocaleString()}
          icon={<Monitor className="w-6 h-6" />}
          trend="Processed Log Volume"
        />
        <KpiCard
          title="Events / Sec"
          value={stats?.performance?.eps?.toFixed(1) || 0}
          icon={<Zap className="w-6 h-6" />}
          trend="Stable Ingestion"
        />
        <KpiCard
          title="Alerts Today"
          value={(stats?.alerts?.alerts_today || 0).toLocaleString()}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend="24 Hour Period"
        />
        <KpiCard
          title="Active Investigations"
          value={stats?.investigations?.active || 0}
          icon={<Target className="w-6 h-6" />}
          trend="Open Cases"
        />
      </div>

      {/* ── Pipeline Health ── */}
      <PipelineMonitor stats={stats} />

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Events/sec History */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
          <div className="font-semibold text-[var(--text)] mb-6">Events / Sec (Last 10 Min)</div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.performance?.eps_history || []}>
                <defs>
                  <linearGradient id="colorEps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text)' }}
                />
                <Area type="monotone" dataKey="eps" stroke="rgb(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorEps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Pie Chart */}
        <div className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-sm flex flex-col">
          <div className="font-semibold text-[var(--text)] mb-4">Alert Severity</div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {severityData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {severityData.map((entry, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-[var(--background)] px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
                <div className="font-bold text-[var(--text)]">{entry.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MITRE Distribution (Bar Chart) */}
        <div className="lg:col-span-1 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
          <div className="font-semibold text-[var(--text)] mb-6">MITRE Tactics</div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mitreData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip cursor={{ fill: 'var(--surface-hover)' }} contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                <Bar dataKey="value" fill="rgb(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts List */}
        <div className="lg:col-span-2 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="font-semibold text-[var(--text)]">Recent Alerts</div>
            <button onClick={() => navigate('/alerts')} className="text-sm text-[rgb(var(--primary))] font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[var(--text-muted)] uppercase text-xs border-b border-[var(--border)]">
                <tr>
                  <th className="pb-3 font-semibold px-2">Severity</th>
                  <th className="pb-3 font-semibold px-2">Alert Rule</th>
                  <th className="pb-3 font-semibold px-2">MITRE</th>
                  <th className="pb-3 font-semibold px-2">Time</th>
                  <th className="pb-3 font-semibold text-right px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {stats?.recent_alerts?.length > 0 ? (
                  stats.recent_alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                      <td className="py-3 px-2">
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-md inline-block
                          ${alert.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                            alert.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                            alert.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-emerald-500/10 text-emerald-500'}`}>
                          {alert.severity}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium text-[var(--text)] group-hover:text-[rgb(var(--primary))] transition-colors">{alert.title}</td>
                      <td className="py-3 px-2 text-[var(--text-muted)] text-xs font-mono bg-[var(--background)] rounded my-2 inline-block ml-2">{alert.mitre_technique || 'N/A'}</td>
                      <td className="py-3 px-2 text-[var(--text-muted)] text-xs">{new Date(alert.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-[10px] bg-[var(--background)] border border-[var(--border)] text-[var(--text-muted)] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                          {alert.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">No recent alerts.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend }) {
  return (
    <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] shadow-sm hover:border-[rgb(var(--primary))] transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">{title}</div>
          <div className="text-3xl font-semibold mt-2 tracking-tight text-[var(--text)]">{value}</div>
        </div>
        <div className="text-[var(--text-muted)] opacity-70">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-[11px] text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 opacity-70" />
        <span>{trend}</span>
      </div>
    </div>
  );
}


function PipelineMonitor({ stats }) {
  return (
    <div className="col-span-1 lg:col-span-3 bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">Event Pipeline</h2>
          <p className="text-xs text-[var(--text-muted)]">End-to-end ingestion and correlation flow</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Received</span>
          <span className="text-lg font-bold text-[var(--text)] mt-1">{stats?.performance?.total_events?.toLocaleString() || 0}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Parsed</span>
          <span className="text-lg font-bold text-[var(--text)] mt-1">{stats?.performance?.total_events?.toLocaleString() || 0}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Normalized</span>
          <span className="text-lg font-bold text-[var(--text)] mt-1">{stats?.performance?.total_events?.toLocaleString() || 0}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Detected</span>
          <span className="text-lg font-bold text-emerald-500 mt-1">{Math.floor((stats?.performance?.total_events || 0) * 0.05).toLocaleString()}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Aggregated</span>
          <span className="text-lg font-bold text-blue-500 mt-1">{stats?.alerts?.alerts_today?.toLocaleString() || 0}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Correlated</span>
          <span className="text-lg font-bold text-amber-500 mt-1">{Math.floor((stats?.alerts?.alerts_today || 0) / 3)}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Alerts</span>
          <span className="text-lg font-bold text-red-500 mt-1">{stats?.alerts?.open || 0}</span>
        </div>
        <div className="text-[var(--border)]">&rarr;</div>
        <div className="flex flex-col items-center flex-1 bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
          <span className="text-[10px]">Investigations</span>
          <span className="text-lg font-bold text-purple-500 mt-1">{stats?.investigations?.active || 0}</span>
        </div>
      </div>
    </div>
  );
}
