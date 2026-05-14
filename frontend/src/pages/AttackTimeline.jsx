import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Terminal, ShieldAlert, Activity, Clock, Globe, 
  ArrowRight, Search, Filter, Database 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AttackTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTimeline = async () => {
    try {
      // We'll combine alerts and recent investigations for a unified timeline
      const [alertsRes, investRes] = await Promise.all([
        axios.get('/api/alerts'),
        axios.get('/api/investigations')
      ]);

      const alerts = (alertsRes.data.data || []).map(a => ({
        id: a.id,
        type: 'ALERT',
        title: a.title,
        severity: a.severity,
        source_ip: a.source_ip,
        timestamp: a.last_seen,
        mitre: a.mitre_technique || 'N/A',
        rule: a.rule_id
      }));

      const investigations = (investRes.data.data || []).map(i => ({
        id: i.id,
        type: 'CASE',
        title: i.title,
        severity: i.severity,
        source_ip: 'VARIOUS',
        timestamp: i.created_at,
        mitre: 'N/A',
        rule: 'INVESTIGATION'
      }));

      const unified = [...alerts, ...investigations].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      setTimeline(unified);
    } catch (err) {
      console.error("Timeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    const id = setInterval(fetchTimeline, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4 max-w-full font-mono text-siem-text">
      
      {/* Console Header */}
      <div className="siem-panel bg-slate-900 border-siem-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-blue-500" />
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-white">Adversary Attack Timeline</h1>
            <p className="text-[9px] text-siem-muted font-bold uppercase tracking-tighter">Real-time Correlation Console · AeriSeg V1.0-MVP</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-black text-emerald-500 uppercase">Live Stream Active</span>
          </div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="siem-panel overflow-hidden">
        <div className="overflow-x-auto bg-slate-950">
          <table className="siem-table w-full">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase text-siem-muted border-b border-siem-border">
                <th className="p-2 text-center w-20">Type</th>
                <th className="p-2 w-32">Timestamp</th>
                <th className="p-2 w-24 text-center">Severity</th>
                <th className="p-2 w-36">Source IP</th>
                <th className="p-2 w-48">MITRE Technique</th>
                <th className="p-2">Event Narrative / Description</th>
                <th className="p-2 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {timeline.length > 0 ? timeline.map((item, i) => (
                <tr key={`${item.type}-${item.id}-${i}`} className="border-b border-slate-900 hover:bg-blue-900/10 transition-all group">
                  <td className="p-2 text-center">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                      item.type === 'ALERT' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-blue-950/30 text-blue-400 border-blue-900/50'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="p-2 text-[10px] text-siem-muted">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour12: false })}.{new Date(item.timestamp).getMilliseconds()}
                  </td>
                  <td className="p-2 text-center">
                    <div className={`text-[9px] font-black uppercase ${
                      item.severity === 'CRITICAL' ? 'text-red-500' : 
                      item.severity === 'HIGH' ? 'text-orange-500' : 'text-blue-500'
                    }`}>
                      {item.severity}
                    </div>
                  </td>
                  <td className="p-2 text-[11px] font-bold text-blue-300">
                    {item.source_ip}
                  </td>
                  <td className="p-2 text-[11px] font-bold text-siem-muted">
                    {item.mitre}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-lg">
                        {item.title}
                      </span>
                      <span className="text-[9px] text-siem-border bg-slate-900 px-1 border border-siem-border rounded">
                        {item.rule}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <button 
                      onClick={() => navigate(item.type === 'ALERT' ? '/alerts' : `/investigations/${item.id}`)}
                      className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-tighter flex items-center gap-1 justify-end"
                    >
                      PIVOT <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-siem-muted text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                    Awaiting adversarial telemetry signals...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="siem-panel bg-slate-900/50 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[9px] font-black text-siem-muted uppercase tracking-widest">Database Health</span>
          </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase">Synchronized</span>
        </div>
        <div className="siem-panel bg-slate-900/50 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[9px] font-black text-siem-muted uppercase tracking-widest">Edge Collectors</span>
          </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase">1 Active</span>
        </div>
        <div className="siem-panel bg-slate-900/50 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[9px] font-black text-siem-muted uppercase tracking-widest">Query Engine</span>
            </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase">Idle</span>
        </div>
      </div>

    </div>
  );
}
