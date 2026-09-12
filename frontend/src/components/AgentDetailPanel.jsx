import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Server, Activity, HardDrive, Cpu, MemoryStick, 
  Terminal, ShieldAlert, Package, Play, RefreshCw, 
  Download, Trash2
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function AgentDetailPanel({ agentId, onClose }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    const fetchAgent = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/agents/${agentId}`);
        setAgent(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
    const interval = setInterval(fetchAgent, 15000);
    return () => clearInterval(interval);
  }, [agentId]);

  if (!agentId) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-[500px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col`}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <Server className="w-5 h-5 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">{agent?.hostname || 'Loading...'}</h2>
            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{agent?.agent_id}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-xl text-[var(--text-muted)] transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {loading && !agent ? (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] animate-pulse">
            <Activity className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-sm font-medium">Fetching telemetry...</span>
          </div>
        ) : agent ? (
          <>
            {/* Header Stats */}
            <div className="flex items-center justify-between">
              <StatusBadge status={agent.status} />
              <div className="text-xs text-[var(--text-muted)] font-medium">
                Registered: {new Date(agent.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* System Info */}
            <div className="grid grid-cols-2 gap-4">
              <InfoBox label="IP Address" value={agent.ip_address} font="font-mono text-sm" />
              <InfoBox label="Operating System" value={agent.os_version} capitalize />
              <InfoBox label="Kernel Version" value={agent.kernel} font="font-mono text-xs" />
              <InfoBox label="Agent Version" value={`v${agent.version}`} />
            </div>

            {/* Live Metrics */}
            <div>
              <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Live Health
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricBox 
                  icon={<Cpu className="w-4 h-4 text-blue-500" />} 
                  label="CPU Usage" 
                  value={`${agent.cpu_usage}%`} 
                  color="text-blue-500" 
                />
                <MetricBox 
                  icon={<MemoryStick className="w-4 h-4 text-purple-500" />} 
                  label="Memory Usage" 
                  value={`${agent.ram_usage} MB`} 
                  color="text-purple-500" 
                />
                <MetricBox 
                  icon={<Terminal className="w-4 h-4 text-emerald-500" />} 
                  label="Logs / Min" 
                  value={agent.logs_per_min} 
                  color="text-emerald-500" 
                />
                <MetricBox 
                  icon={<ShieldAlert className="w-4 h-4 text-amber-500" />} 
                  label="Alerts Generated" 
                  value={agent.alerts_generated} 
                  color="text-amber-500" 
                />
                <MetricBox 
                  icon={<Package className="w-4 h-4 text-siem-muted" />} 
                  label="Packages" 
                  value={agent.installed_packages} 
                  color="text-[var(--text)]" 
                />
                <MetricBox 
                  icon={<Play className="w-4 h-4 text-siem-muted" />} 
                  label="Running Services" 
                  value={agent.running_services} 
                  color="text-[var(--text)]" 
                />
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" /> Agent Actions
              </h3>
              <div className="space-y-2">
                <ActionBtn icon={<RefreshCw />} label="Restart Agent" />
                <ActionBtn icon={<Download />} label="Update Agent" />
                <ActionBtn icon={<Terminal />} label="Collect Diagnostics" />
                <ActionBtn icon={<Trash2 />} label="Remove Agent" danger />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-[var(--text-muted)] py-12">Agent not found.</div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value, font = "font-semibold", capitalize = false }) {
  return (
    <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-[var(--text)] truncate ${font} ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}

function MetricBox({ icon, label, value, color }) {
  return (
    <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)] flex items-center gap-4">
      <div className="p-2 bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)]">
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-0.5">{label}</div>
        <div className={`text-xl font-bold tracking-tight ${color}`}>{value}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, danger }) {
  return (
    <button className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-semibold
      ${danger 
        ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' 
        : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)] hover:border-[rgb(var(--primary))]'
      }`}
    >
      {React.cloneElement(icon, { className: "w-4 h-4" })}
      {label}
    </button>
  );
}
