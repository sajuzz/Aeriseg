import React from 'react';
import { Shield, Zap, Lock, Terminal, Activity, Search } from 'lucide-react';

const TACTICS = [
  { id: 'TA0001', name: 'Initial Access', icon: GlobeIcon },
  { id: 'TA0002', name: 'Execution', icon: Terminal },
  { id: 'TA0003', name: 'Persistence', icon: Lock },
  { id: 'TA0004', name: 'Privilege Escalation', icon: TrendingUpIcon },
  { id: 'TA0005', name: 'Defense Evasion', icon: Shield },
  { id: 'TA0006', name: 'Credential Access', icon: KeyIcon },
  { id: 'TA0007', name: 'Discovery', icon: Search },
  { id: 'TA0008', name: 'Lateral Movement', icon: Activity },
  { id: 'TA0009', name: 'Collection', icon: DatabaseIcon },
  { id: 'TA0011', name: 'Command and Control', icon: Zap },
  { id: 'TA0010', name: 'Exfiltration', icon: ExternalLinkIcon },
  { id: 'TA0040', name: 'Impact', icon: AlertTriangleIcon },
];

export default function MitreHeatmap({ data = {} }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {TACTICS.map((tactic) => {
        const count = data[tactic.id] || 0;
        const Icon = tactic.icon;
        
        return (
          <div 
            key={tactic.id}
            className={`p-3 rounded-xl border transition-all flex flex-col justify-between h-24 ${
              count > 0 
                ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'bg-slate-900/50 border-siem-border opacity-40'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon className={`w-4 h-4 ${count > 0 ? 'text-blue-400' : 'text-siem-muted'}`} />
              <span className={`text-[10px] font-black ${count > 0 ? 'text-white' : 'text-siem-muted'}`}>
                {tactic.id}
              </span>
            </div>
            <div>
              <div className="text-[9px] font-black text-siem-muted uppercase tracking-tighter truncate mb-1">
                {tactic.name}
              </div>
              <div className={`text-sm font-black ${count > 0 ? 'text-blue-400' : 'text-siem-muted opacity-20'}`}>
                {count} <span className="text-[8px] opacity-50">DETECTIONS</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlobeIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function TrendingUpIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function KeyIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5"/></svg>; }
function DatabaseIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>; }
function ExternalLinkIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function AlertTriangleIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
