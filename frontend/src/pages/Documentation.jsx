import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Shield, Code, Terminal, Server, CheckCircle2, AlertCircle, Database, Cpu, Activity, Layout } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

export default function Documentation() {
  const user = useAuthStore(state => state.user);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await axios.get('/api/system/health');
        setHealth(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 bg-siem-bg overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-siem-panel border-r border-siem-border p-6 space-y-8 overflow-y-auto custom-scrollbar">
        <div>
          <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-4">Operations</h3>
          <DocNav title="Analyst Guide" icon={<BookOpen className="w-4 h-4" />} active />
          <DocNav title="Triage Workflow" icon={<Shield className="w-4 h-4" />} />
        </div>
        
        {user?.role === 'ADMIN' && (
          <div>
            <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-widest mb-4">Administration</h3>
            <DocNav title="Platform Health" icon={<Activity className="w-4 h-4" />} />
            <DocNav title="ASQL Syntax" icon={<Code className="w-4 h-4" />} />
            <DocNav title="User Management" icon={<Terminal className="w-4 h-4" />} />

          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-siem-panel">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
               <BookOpen className="w-8 h-8" />
               <h1 className="text-4xl font-black tracking-tight text-siem-text">AeriSeg Portal</h1>
            </div>
            <p className="text-lg text-siem-muted font-medium leading-relaxed">
              AeriSeg is a **Telemetry-Normalized SIEM Platform** designed for mission-critical infrastructure. 
              By decoupling telemetry ingestion from detection logic, the platform provides unified defense 
              visibility across IT, OT, IoT, and Healthcare domains.
            </p>
          </div>


          <hr className="border-siem-border" />

          {/* Platform Health (Admin Only) */}
          {user?.role === 'ADMIN' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-black text-siem-text flex items-center gap-3">
                   <Activity className="w-6 h-6 text-emerald-500" />
                   System Health Dashboard
                 </h2>
                 <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Operational
                 </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <HealthCard 
                   title="Backend API" 
                   value={health?.stack?.backend} 
                   status="online" 
                   icon={<Cpu className="w-4 h-4" />} 
                 />
                 <HealthCard 
                   title="Main Database" 
                   value={`${health?.components?.database?.size_mb} MB`} 
                   status={health?.components?.database?.status} 
                   icon={<Database className="w-4 h-4" />} 
                 />
                 <HealthCard 
                   title="Detection Rules" 
                   value={`${health?.components?.detection_engine?.rules_loaded} Active`} 
                   status={health?.components?.detection_engine?.status} 
                   icon={<Shield className="w-4 h-4" />} 
                 />
                 <HealthCard 
                   title="Ingestion Hub" 
                   value={`${health?.components?.ingestion?.events_last_hour} eps/h`} 
                   status={health?.components?.ingestion?.status} 
                   icon={<Server className="w-4 h-4" />} 
                 />
              </div>

              <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <Layout className="w-32 h-32" />
                 </div>
                 <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Technology Stack Documentation</h4>
                 <div className="grid grid-cols-2 gap-8 text-sm">
                    <div>
                       <div className="text-siem-muted font-bold mb-2 uppercase text-[10px]">Core Stack</div>
                       <ul className="space-y-2 font-mono text-blue-100">
                          <li>• FastAPI (Asynchronous Backend)</li>
                          <li>• React 18 + Zustand (State)</li>
                          <li>• SQLite 3 (Persistence)</li>
                          <li>• Tailwind CSS (UX/UI)</li>
                       </ul>
                    </div>
                    <div>
                       <div className="text-siem-muted font-bold mb-2 uppercase text-[10px]">Infrastructure</div>
                       <ul className="space-y-2 font-mono text-blue-100">
                          <li>• WebSockets (Real-time Streaming)</li>
                          <li>• AeriSeg Detection Engine</li>
                          <li>• ASQL Query Compiler</li>
                          <li>• JWT Authentication</li>
                       </ul>
                    </div>
                 </div>
              </div>
            </section>
          )}

          {/* ASQL Documentation Section */}
          <section id="asql" className="space-y-8">
            <h2 className="text-2xl font-black text-siem-text flex items-center gap-3">
              <Code className="w-6 h-6 text-indigo-600" />
              ASQL Query Language
            </h2>
            <div className="bg-siem-bg border border-siem-border rounded-2xl p-8 space-y-6">
              <p className="text-siem-muted leading-relaxed">
                AeriSeg Structured Query Language (ASQL) is a powerful, lightweight syntax designed for rapid threat hunting across distributed telemetry nodes.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-siem-text uppercase text-[10px] tracking-widest">Syntax Basics</h4>
                  <div className="bg-siem-panel p-4 rounded-xl border border-siem-border font-mono text-xs text-siem-text">
                    key:value
                  </div>
                  <p className="text-xs text-siem-muted">Filters by specific fields. Multiple terms are combined with an implicit <span className="font-bold">AND</span>.</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-siem-text uppercase text-[10px] tracking-widest">Full-Text Search</h4>
                  <div className="bg-siem-panel p-4 rounded-xl border border-siem-border font-mono text-xs text-siem-text">
                    "malware"
                  </div>
                  <p className="text-xs text-siem-muted">General terms search across all raw log data using substring matching.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-siem-text uppercase text-[10px] tracking-widest">Supported Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {['source', 'event_type', 'source_ip', 'severity', 'timestamp', 'alert_id', 'rule_name'].map(field => (
                    <span key={field} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-mono">{field}</span>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-900 text-indigo-100 p-6 rounded-2xl space-y-3">
                <h4 className="font-bold uppercase text-[10px] tracking-widest text-indigo-300">Advanced Example</h4>
                <div className="font-mono text-sm">
                  source:suricata severity:CRITICAL "SQL Injection"
                </div>
                <p className="text-xs text-indigo-400">Finds all Suricata alerts with Critical severity containing the string "SQL Injection".</p>
              </div>
            </div>
          </section>

          {/* System Working / Architecture Section */}
          <section id="working" className="space-y-8">
            <h2 className="text-2xl font-black text-siem-text flex items-center gap-3">
              <Server className="w-6 h-6 text-emerald-600" />
              How AeriSeg Works
            </h2>
            <div className="relative p-8 bg-siem-panel border border-siem-border rounded-3xl overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full opacity-50 -mr-8 -mt-8"></div>
               <div className="space-y-8 relative">
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-lg shadow-blue-200">1</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-siem-text">Multi-Source Ingestion</h4>
                      <p className="text-sm text-siem-muted">Security agents (IT), medical devices (HL7), and industrial controllers (Modbus) ship raw logs to the central API.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-lg shadow-indigo-200">2</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-siem-text">Modular Parser Registry</h4>
                      <p className="text-sm text-siem-muted">The <strong>Parser Registry</strong> identifies the source and normalizes raw data into our <strong>Unified Telemetry Schema</strong> before storage.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold shadow-lg shadow-purple-200">3</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-siem-text">Detection Engine</h4>
                      <p className="text-sm text-siem-muted">The engine evaluates each log against rulesets, generating prioritized alerts for analysts.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-lg shadow-emerald-200">4</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-siem-text">Real-time Visualization</h4>
                      <p className="text-sm text-siem-muted">WebSockets broadcast new telemetry and alerts to the UI instantly for rapid SOC response.</p>
                    </div>
                  </div>
               </div>
            </div>
          </section>


          {/* Analyst Guide (Available to All) */}
          <section className="space-y-8">
            <h2 className="text-2xl font-black text-siem-text flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              SOC Analyst Operations
            </h2>

            <div className="space-y-12">
               <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                     <span className="text-blue-600 font-black text-xl">1</span>
                  </div>
                  <div className="space-y-2">
                     <h4 className="font-bold text-siem-text text-lg">Alert Triage & Ownership</h4>
                     <p className="text-siem-muted leading-relaxed">
                        Every incoming alert in the **Alerts Queue** should be triaged within 15 minutes. 
                        Click the **"Unassigned"** badge to claim ownership of a threat. This ensures multiple 
                        analysts don't duplicate efforts on the same incident.
                     </p>
                  </div>
               </div>

               <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                     <span className="text-indigo-600 font-black text-xl">2</span>
                  </div>
                  <div className="space-y-2">
                     <h4 className="font-bold text-siem-text text-lg">Promoting to Investigation</h4>
                     <p className="text-siem-muted leading-relaxed">
                        If an alert is confirmed malicious, use the **"Investigate"** button. This creates 
                        a unified case file where you can track evidence, execute containment actions, 
                        and record activity in the chronological narrative timeline.
                     </p>
                  </div>
               </div>

               <div className="flex gap-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                     <span className="text-emerald-600 font-black text-xl">3</span>
                  </div>
                  <div className="space-y-2">
                     <h4 className="font-bold text-siem-text text-lg">Air-Gapped Segmented Defense</h4>
                     <p className="text-siem-muted leading-relaxed">
                        AeriSeg is designed for high-security environments. Use the **Segmentation** features 
                        to isolate network clusters. Within an investigation, you can propose 
                        actions like **Blocking a Source IP** to immediately contain lateral movement.
                     </p>
                  </div>
               </div>

            </div>
          </section>

          {/* Footer Branding */}
          <div className="pt-12 text-center border-t border-siem-border">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">AeriSeg Grid • Air-Gapped Isolation SIEM</p>
          </div>

        </div>
      </div>
    </div>
  );
}

function DocNav({ title, icon, active }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all mb-1 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-siem-muted hover:bg-siem-bg hover:text-siem-text'}`}>
      {icon}
      {title}
    </button>
  );
}

function HealthCard({ title, value, status, icon }) {
  const isOnline = status === 'online' || status === 'active';
  return (
    <div className="bg-siem-panel border border-siem-border p-4 rounded-2xl shadow-sm">
       <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-black text-siem-muted uppercase tracking-widest">{title}</div>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
       </div>
       <div className="text-sm font-black text-siem-text truncate">{value || 'Pending...'}</div>
    </div>
  );
}
