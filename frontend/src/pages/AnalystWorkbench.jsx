import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, Terminal, Activity, Zap, 
  Database, User, AlertTriangle, ArrowLeft,
  Search, Info, Globe, Lock, ShieldCheck,
  ChevronRight, ExternalLink
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function AnalystWorkbench() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);

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
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-blue-500"/> RULE: {alert.rule_id}</span>
              <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-indigo-500"/> DETECTED: {new Date(alert.first_seen).toLocaleString()}</span>
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

          <div className="enterprise-card">
            <div className="p-4 border-b border-siem-border flex items-center gap-2 bg-slate-900/30">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Targeted Asset Context</h3>
            </div>
            <div className="p-6 space-y-6">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-900 rounded-2xl border border-siem-border flex items-center justify-center">
                   <ServerIcon className="w-6 h-6 text-blue-500" />
                 </div>
                 <div>
                   <div className="text-sm font-black text-white uppercase">ICU-MED-SERVER-04</div>
                   <div className="text-[10px] text-siem-critical font-bold uppercase tracking-widest">Critical Asset · Prod</div>
                 </div>
               </div>
               <div className="space-y-3 pt-4 border-t border-siem-border">
                 <IntelRow label="Operating System" value="Windows Server 2022" />
                 <IntelRow label="Department" value="Healthcare Ops" />
                 <IntelRow label="Asset Owner" value="Dr. Sarah Chen" />
               </div>
            </div>
          </div>
        </div>

        {/* ── Column 2: Forensics & Payload ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-siem-border flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Technical Forensic Drilldown</h3>
              </div>
              <div className="flex gap-2">
                 <TabButton label="Packet Payload" active />
                 <TabButton label="ASQL Context" />
              </div>
            </div>
            <div className="flex-1 p-0 overflow-hidden bg-slate-950 font-mono text-xs">
               <div className="p-6 text-blue-300 leading-relaxed whitespace-pre-wrap">
                 {JSON.stringify(JSON.parse(alert.raw_payload || '{}'), null, 2)}
               </div>
            </div>
            <div className="p-4 bg-slate-900 border-t border-siem-border text-[9px] text-siem-muted uppercase font-black tracking-widest flex items-center gap-2">
              <Info className="w-3 h-3 text-blue-500" /> Normalized from Suricata EVE.json pipeline
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="enterprise-card p-6">
              <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-4">MITRE Mapping</h3>
              <div className="flex items-center gap-3">
                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase">{alert.mitre_technique || 'T1190'}</div>
                  <div className="text-[9px] text-siem-muted font-bold uppercase tracking-tight">Exploit Public-Facing Application</div>
                </div>
              </div>
            </div>
            <div className="enterprise-card p-6 flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-1">Deduplication</h3>
                <div className="text-2xl font-black text-white">{alert.dedup_count} <span className="text-xs text-siem-muted">HITS</span></div>
              </div>
              <Activity className="w-8 h-8 text-emerald-500/30" />
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

function TabButton({ label, active }) {
  return (
    <button className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-siem-muted hover:text-white'
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
