import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Monitor, Download, ShieldCheck, Activity, Search, Server, MoreVertical } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import AgentDeploymentModal from '../components/AgentDeploymentModal';


export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeployModal, setShowDeployModal] = useState(false);


  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter(a => 
    a.hostname?.toLowerCase().includes(search.toLowerCase()) || 
    a.ip_address?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Agents</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Endpoint Detection & Response</p>
          </div>
        </div>
        <button 
          onClick={() => setShowDeployModal(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
        >
          <Download className="w-4 h-4" /> Deploy Agent
        </button>
      </div>

      <AgentDeploymentModal isOpen={showDeployModal} onClose={() => setShowDeployModal(false)} />


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AgentStatCard title="Active Endpoints" value={agents.filter(a => a.status === 'ONLINE').length} total={agents.length} icon={<Monitor className="text-emerald-500" />} />
        <AgentStatCard title="Healthy Fleet" value="100%" subtitle="No agent errors detected" icon={<ShieldCheck className="text-blue-500" />} />
        <AgentStatCard title="Last 24h Events" value="1.2k" subtitle="Telemetry ingestion active" icon={<Activity className="text-indigo-500" />} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Filter by hostname or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold sticky top-0 shadow-sm z-10">
                <th className="p-4 pl-6">Hostname / Agent ID</th>
                <th className="p-4">Status</th>
                <th className="p-4">OS Info</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Version</th>
                <th className="p-4 text-right pr-6">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      {agent.hostname}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{agent.agent_id}</div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="p-4">
                    <div className="text-slate-700 font-medium capitalize">{agent.os_type}</div>
                    <div className="text-[10px] text-slate-400">{agent.os_version}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-600 font-mono text-xs">{agent.ip_address}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-600 text-xs font-medium">v{agent.version}</div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <div className="text-slate-600 text-xs">{new Date(agent.last_seen).toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgentStatCard({ title, value, total, subtitle, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</div>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-black text-slate-900">{value}</div>
        {total && <div className="text-sm font-bold text-slate-400">/ {total}</div>}
      </div>
      {subtitle && <div className="text-[10px] font-bold text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}
