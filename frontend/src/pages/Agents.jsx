import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Monitor, Download, ShieldCheck, Activity, Search, Server, MoreVertical, Zap } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import AgentDeploymentModal from '../components/AgentDeploymentModal';
import AgentDetailPanel from '../components/AgentDetailPanel';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats/summary');
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchStats();
    const id = setInterval(() => {
      fetchAgents();
      fetchStats();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const filteredAgents = agents.filter(a => 
    a.hostname?.toLowerCase().includes(search.toLowerCase()) || 
    a.ip_address?.includes(search)
  );

  const onlineCount = agents.filter(a => a.status === 'ONLINE').length;
  const fleetHealthPercent = agents.length > 0 ? `${Math.round((onlineCount / agents.length) * 100)}%` : '0%';
  const realEventCount = stats?.performance?.events_today != null 
    ? stats.performance.events_today.toLocaleString() 
    : (stats?.performance?.total_events != null ? stats.performance.total_events.toLocaleString() : '0');
  const realEps = stats?.performance?.eps?.toFixed(1) || '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
            <ShieldCheck className="w-6 h-6 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">Security Agents</h1>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">Endpoint Detection & Response</p>
          </div>
        </div>
        <button 
          onClick={() => setShowDeployModal(true)}
          className="px-5 py-2.5 bg-[rgb(var(--primary))] text-white rounded-3xl text-sm font-semibold flex items-center gap-2 shadow-md hover:bg-[rgb(var(--primary),0.9)] transition-colors"
        >
          <Download className="w-4 h-4" /> Deploy Agent
        </button>
      </div>

      <AgentDeploymentModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
        onDeployed={() => { fetchAgents(); fetchStats(); }} 
      />

      <AgentDetailPanel 
        agentId={selectedAgentId} 
        onClose={() => setSelectedAgentId(null)} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AgentStatCard 
          title="Active Endpoints" 
          value={onlineCount} 
          total={agents.length} 
          icon={<Monitor className="text-emerald-500" />} 
        />
        <AgentStatCard 
          title="Healthy Fleet" 
          value={fleetHealthPercent} 
          subtitle="Real-time heartbeat verified" 
          icon={<ShieldCheck className="text-blue-500" />} 
        />
        <AgentStatCard 
          title="Last 24h Events" 
          value={realEventCount} 
          subtitle="Live telemetry ingested" 
          icon={<Activity className="text-indigo-500" />} 
        />
        <AgentStatCard 
          title="Ingestion Rate" 
          value={`${realEps} EPS`} 
          subtitle="Real-time events per second" 
          icon={<Zap className="text-amber-500" />} 
        />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--background)] flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-2.5" />
            <input 
              type="text" 
              placeholder="Filter by hostname or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-3xl text-sm text-[var(--text)] focus:outline-none focus:border-[rgb(var(--primary))] transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold sticky top-0 shadow-sm z-10">
                <th className="p-4 pl-6">Hostname / Agent ID</th>
                <th className="p-4">Status</th>
                <th className="p-4">OS Info</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Version</th>
                <th className="p-4 text-right pr-6">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {filteredAgents.length > 0 ? (
                filteredAgents.map(agent => (
                  <tr 
                    key={agent.id} 
                    onClick={() => setSelectedAgentId(agent.agent_id)}
                    className="hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
                  >
                    <td className="p-4 pl-6">
                      <div className="font-bold text-[var(--text)] group-hover:text-[rgb(var(--primary))] transition-colors flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {agent.hostname}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{agent.agent_id}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="p-4">
                      <div className="text-[var(--text)] font-medium capitalize">{agent.os_type}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{agent.os_version}</div>
                    </td>
                    <td className="p-4">
                      <div className="bg-[var(--background)] border border-[var(--border)] text-[var(--text-muted)] font-mono text-[10px] px-2 py-1 rounded-lg inline-block">
                        {agent.ip_address}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[var(--text-muted)] text-xs font-medium">v{agent.version}</div>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="text-[var(--text-muted)] text-xs">{new Date(agent.last_seen).toLocaleString()}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[var(--text-muted)] text-sm">
                    {loading ? 'Loading agents...' : 'No agents connected.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgentStatCard({ title, value, total, subtitle, icon }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{title}</div>
        <div className="p-2 bg-[var(--background)] border border-[var(--border)] rounded-xl">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold text-[var(--text)] tracking-tight">{value}</div>
        {total && <div className="text-sm font-bold text-[var(--text-muted)]">/ {total}</div>}
      </div>
      {subtitle && <div className="text-[10px] font-bold text-[var(--text-muted)] mt-2 uppercase tracking-widest">{subtitle}</div>}
    </div>
  );
}
