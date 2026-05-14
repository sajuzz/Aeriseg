import React, { useState } from 'react';
import axios from 'axios';
import { 
  Zap, ShieldAlert, Target, Activity, 
  Terminal, Play, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function AttackSimulator() {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const triggerAttack = async (type) => {
    setLoading(true);
    setLastAction(`Triggering ${type} sequence...`);
    try {
      const res = await axios.post(`/api/simulator/trigger?attack_type=${type}`);
      setLastAction({ status: 'success', msg: res.data.message });
    } catch (err) {
      setLastAction({ status: 'error', msg: 'Simulation failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="border-b border-siem-border pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-amber-600/10 p-2 rounded-xl border border-amber-500/30">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Detection Lab</h1>
        </div>
        <p className="text-siem-muted font-medium">Attack Simulation & Pipeline Validation Environment</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Sim Controls */}
        <div className="space-y-6">
          <div className="enterprise-card p-6">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" /> Adversary Simulations
            </h3>
            
            <div className="space-y-4">
              <SimulatorButton 
                title="SQL Injection Sequence" 
                desc="Injects UNION SELECT based SQLi telemetry targeting patient DBs."
                icon={<ShieldAlert className="w-5 h-5" />}
                color="red"
                onClick={() => triggerAttack('sqli')}
                disabled={loading}
              />
              <SimulatorButton 
                title="SSH Brute Force" 
                desc="Simulates a multi-attempt credential stuffing attack from external IP."
                icon={<Activity className="w-5 h-5" />}
                color="orange"
                onClick={() => triggerAttack('brute_force')}
                disabled={loading}
              />
              <SimulatorButton 
                title="Internal Network Scan" 
                desc="Simulates a rapid horizontal port scan against the management segment."
                icon={<Terminal className="w-5 h-5" />}
                color="blue"
                onClick={() => triggerAttack('port_scan')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Right: Status & Logs */}
        <div className="space-y-6">
          <div className="enterprise-card bg-slate-950 p-6 border-siem-border h-full flex flex-col">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Simulation Console
            </h3>
            
            <div className="flex-1 bg-slate-900 rounded-xl p-4 font-mono text-sm border border-siem-border overflow-y-auto min-h-[300px]">
              {typeof lastAction === 'string' ? (
                <div className="text-blue-400 animate-pulse">{`> ${lastAction}`}</div>
              ) : lastAction?.status === 'success' ? (
                <div className="space-y-2">
                  <div className="text-emerald-400 font-bold">{`> [COMPLETED] ${lastAction.msg}`}</div>
                  <div className="text-siem-muted text-xs">{`> Pipeline: Telemetry -> Ingestor -> DetectionEngine -> AlertRepo`}</div>
                  <div className="text-siem-muted text-xs">{`> Broadcast: Campaign Correlation Active`}</div>
                </div>
              ) : lastAction?.status === 'error' ? (
                <div className="text-red-400">{`> [ERROR] ${lastAction.msg}`}</div>
              ) : (
                <div className="text-siem-muted opacity-50">System ready. Awaiting simulation trigger...</div>
              )}
            </div>

            <div className="mt-4 p-4 bg-blue-600/5 rounded-xl border border-blue-500/20 text-xs text-blue-400 flex items-start gap-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Triggering these actions will generate real alerts in the <b>Alert Queue</b> and <b>Attack Timeline</b>. Ensure your detection rules are enabled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulatorButton({ title, desc, icon, color, onClick, disabled }) {
  const colors = {
    red: "hover:bg-red-950/20 hover:border-red-500/50 text-red-500",
    orange: "hover:bg-orange-950/20 hover:border-orange-500/50 text-orange-500",
    blue: "hover:bg-blue-950/20 hover:border-blue-500/50 text-blue-500"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border border-siem-border bg-slate-900/50 transition-all flex items-center gap-4 group ${colors[color]}`}
    >
      <div className={`p-3 rounded-xl bg-slate-900 border border-siem-border group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors">{title}</div>
        <div className="text-[10px] font-bold text-siem-muted uppercase mt-0.5 leading-tight">{desc}</div>
      </div>
      <Play className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
