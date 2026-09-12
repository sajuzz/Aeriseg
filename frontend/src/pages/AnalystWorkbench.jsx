import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, Terminal, Activity, Zap, 
  Database, User, AlertTriangle, ArrowLeft,
  Search, Info, Globe, Lock, ShieldCheck,
  ChevronRight, ExternalLink, List, Clock
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function AnalystWorkbench() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const res = await axios.get(`/api/alerts/${id}`);
        setAlert(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [id]);

  if (loading) return <div className="p-20 text-center animate-pulse text-siem-muted uppercase tracking-widest font-black">Initializing Analyst Grid...</div>;
  if (!alert) return <div className="p-20 text-center text-siem-critical font-black">ALERT NOT FOUND</div>;

  const firstSeen = new Date(alert.first_seen);
  const lastSeen = new Date(alert.last_seen);
  const durationMs = lastSeen.getTime() - firstSeen.getTime();
  const durationMins = Math.floor(durationMs / 60000);
  const durationSecs = Math.floor((durationMs % 60000) / 1000);
  const durationStr = `${durationMins}m ${durationSecs}s`;

  return (
    <div className="space-y-6 max-w-full pb-20">
      
      {/* ── Workbench Header ────────────────────────────────────────────── */}
      <div className="enterprise-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/alerts" className="p-3 bg-slate-900 border border-siem-border rounded-xl hover:bg-siem-border/20 transition-all">
            <ArrowLeft className="w-5 h-5 text-siem-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <StatusBadge status={alert.severity} />
              <div className="bg-blue-600/10 text-blue-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> CONFIDENCE: {alert.confidence_score}%
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">{alert.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-siem-muted uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-blue-500"/> RULE: {alert.rule_id} (v{alert.rule_version || '1.0'})</span>
              <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-indigo-500"/> STATUS: {alert.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
           <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">
             Escalate to Case
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Column 1: Entities & Intel ─────────────────────────────────── */}
        <div className="space-y-6">
          <div className="enterprise-card">
            <div className="p-4 border-b border-siem-border flex items-center gap-2 bg-slate-900/30">
              <Globe className="w-4 h-4 text-blue-400" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Adversary Intelligence</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[9px] font-black text-siem-muted uppercase tracking-widest block mb-2">Source IP Address</label>
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-siem-border rounded-xl">
                  <span className="text-lg font-black text-white font-mono">{alert.source_ip}</span>
                  <button className="text-[9px] text-blue-400 font-black hover:text-white uppercase tracking-widest">WHOIS</button>
                </div>
              </div>
              
              <div className="space-y-3">
                <IntelRow label="Reputation Score" value={`${alert.confidence_score + 12}% Malicious`} color="text-red-500" />
                <IntelRow label="Known Actor" value="Cobalt Group (Suspected)" color="text-amber-500" />
                <IntelRow label="ASN / Owner" value="AS16276 OVH SAS" />
                <IntelRow label="Country" value="France (FR)" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="enterprise-card p-4 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-1">Occurrences</h3>
              <div className="text-2xl font-black text-white">{alert.dedup_count}</div>
            </div>
            <div className="enterprise-card p-4 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-1">Duration</h3>
              <div className="text-lg font-black text-emerald-400">{durationStr}</div>
            </div>
            <div className="enterprise-card p-4 col-span-2 flex flex-col justify-center">
              <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-1">Timeline Window</h3>
              <div className="flex justify-between mt-1 text-[11px] font-bold text-white uppercase">
                <span>{firstSeen.toLocaleTimeString()}</span>
                <span className="text-siem-muted">&rarr;</span>
                <span>{lastSeen.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Column 2: Forensics & Tabs ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card flex flex-col min-h-[600px]">
            <div className="p-4 border-b border-siem-border flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Technical Drilldown</h3>
              </div>
              <div className="flex gap-2">
                 <TabButton label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
                 <TabButton label="Evidence" active={activeTab === 'Evidence'} onClick={() => setActiveTab('Evidence')} />
                 <TabButton label="Timeline" active={activeTab === 'Timeline'} onClick={() => setActiveTab('Timeline')} />
                 <TabButton label="Raw JSON" active={activeTab === 'Raw JSON'} onClick={() => setActiveTab('Raw JSON')} />
              </div>
            </div>
            
            <div className="flex-1 p-0 overflow-y-auto bg-slate-950 font-mono text-xs relative">
               
               {activeTab === 'Overview' && (
                 <div className="p-6 space-y-8 font-sans">
                    <div>
                      <h4 className="text-white font-bold mb-2">Detection Summary</h4>
                      <p className="text-siem-muted text-sm leading-relaxed">
                        The correlation engine grouped <strong>{alert.dedup_count}</strong> events matching the <strong>{alert.rule_id}</strong> signature.
                        Activity was observed over a <strong>{durationStr}</strong> window originating from <strong>{alert.source_ip}</strong>.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-bold mb-3">MITRE ATT&CK Mapping</h4>
                      <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-siem-border">
                        <div className="bg-red-500/10 border border-red-500/30 p-2 rounded-lg">
                          <Zap className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white uppercase">{alert.mitre_technique || 'T1190'}</div>
                          <div className="text-xs text-siem-muted font-bold uppercase tracking-tight">{alert.mitre_tactic || 'Exploit Public-Facing Application'}</div>
                        </div>
                      </div>
                    </div>
                 </div>
               )}
               
               {activeTab === 'Evidence' && (
                 <div className="p-6">
                    <h4 className="text-white font-bold font-sans mb-4">Related Source Events ({alert.related_events?.length || 0})</h4>
                    <div className="space-y-4">
                      {alert.related_events?.map((ev, idx) => (
                        <div key={idx} className="bg-slate-900 border border-siem-border p-4 rounded-xl">
                          <div className="flex justify-between text-siem-muted font-bold uppercase tracking-widest text-[10px] mb-2 border-b border-siem-border pb-2">
                            <span>{new Date(ev.timestamp).toLocaleString()}</span>
                            <span>{ev.source}</span>
                          </div>
                          <div className="text-blue-300 whitespace-pre-wrap mt-2">
                            {JSON.stringify(ev.raw_log, null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
               
               {activeTab === 'Timeline' && (
                 <div className="p-6 font-sans">
                    <div className="relative border-l-2 border-siem-border ml-3 space-y-8">
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1" />
                        <div className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-1">{firstSeen.toLocaleString()}</div>
                        <div className="text-white font-bold">Initial Detection</div>
                        <div className="text-sm text-siem-muted mt-1">First occurrence observed by pipeline.</div>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1" />
                        <div className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-1">Aggregation Window</div>
                        <div className="text-white font-bold">Correlation Engine Active</div>
                        <div className="text-sm text-siem-muted mt-1">Grouped {alert.dedup_count - 1} subsequent events matching the deduplication key.</div>
                      </div>
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1" />
                        <div className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-1">{lastSeen.toLocaleString()}</div>
                        <div className="text-white font-bold">Last Seen</div>
                        <div className="text-sm text-siem-muted mt-1">Most recent activity observed.</div>
                      </div>
                    </div>
                 </div>
               )}
               
               {activeTab === 'Raw JSON' && (
                 <div className="p-6 text-blue-300 leading-relaxed whitespace-pre-wrap">
                   {JSON.stringify(JSON.parse(alert.raw_payload || '{}'), null, 2)}
                 </div>
               )}
               
            </div>
            <div className="p-4 bg-slate-900 border-t border-siem-border text-[9px] text-siem-muted uppercase font-black tracking-widest flex items-center gap-2">
              <Info className="w-3 h-3 text-blue-500" /> Evidence immutable log derived from Pipeline
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelRow({ label, value, color = "text-siem-text" }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[10px] font-bold text-siem-muted uppercase tracking-tight">{label}</span>
      <span className={`text-[11px] font-black uppercase tracking-tight ${color}`}>{value}</span>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-siem-muted hover:text-white hover:bg-slate-800'
    }`}>
      {label}
    </button>
  );
}

function ClockIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

function ServerIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
}
