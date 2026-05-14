import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings as SettingsIcon, Zap, Shield, 
  Database, Bell, Lock, ToggleLeft, ToggleRight,
  RefreshCcw, AlertTriangle, CheckCircle
} from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/config');
      setConfig(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConfig = async (key) => {
    const newValue = config[key] === 'true' ? 'false' : 'true';
    setSaving(true);
    try {
      await axios.patch(`/api/config/${key}`, { value: newValue });
      setConfig(prev => ({ ...prev, [key]: newValue }));
    } catch (err) {
      alert("Failed to update config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-siem-muted uppercase tracking-widest font-black">Loading System Grid Config...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      <div className="flex items-center gap-3 border-b border-siem-border pb-6">
        <div className="bg-slate-900 p-2.5 rounded-xl border border-siem-border">
          <SettingsIcon className="w-6 h-6 text-siem-muted" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">System Settings</h1>
          <p className="text-sm text-siem-muted font-medium">Global SIEM Configuration & Grid Control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Demo Mode Card */}
        <div className="enterprise-card p-8 flex items-center justify-between group">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl border transition-all ${
              config.DEMO_MODE === 'true' 
                ? 'bg-amber-600/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                : 'bg-slate-900 border-siem-border text-siem-muted'
            }`}>
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
                Presentation Demo Mode
                {config.DEMO_MODE === 'true' && <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE</span>}
              </h3>
              <p className="text-xs text-siem-muted font-medium max-w-md leading-relaxed">
                When enabled, the SIEM will automatically generate synthetic attack telemetry every 30-90 seconds to keep dashboards and correlation graphs populated for demonstrations.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => toggleConfig('DEMO_MODE')}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
              config.DEMO_MODE === 'true'
                ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-900/20'
                : 'bg-slate-900 border border-siem-border text-siem-muted hover:border-amber-500/50'
            }`}
          >
            {config.DEMO_MODE === 'true' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {config.DEMO_MODE === 'true' ? 'DISABLE DEMO' : 'ENABLE DEMO'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingCard 
            icon={<Lock className="w-5 h-5 text-blue-500" />}
            title="RBAC Controls"
            desc="Manage analyst permissions and administrative role assignments."
            action="CONFIGURE"
          />
          <SettingCard 
            icon={<Database className="w-5 h-5 text-emerald-500" />}
            title="Data Retention"
            desc="Set TTL and archival policies for telemetry and alert history."
            action="MANAGE"
          />
          <SettingCard 
            icon={<Bell className="w-5 h-5 text-indigo-500" />}
            title="Notification Webhooks"
            desc="Global alerting routes for Slack, Teams, and Jira integrations."
            action="SETUP"
          />
          <SettingCard 
            icon={<Shield className="w-5 h-5 text-siem-critical" />}
            title="Security Hardening"
            desc="Platform-wide audit logging and session security policies."
            action="AUDIT"
          />
        </div>

        <div className="mt-12 p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-blue-400 mt-1" />
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Configuration Notice</h4>
            <p className="text-xs text-blue-300/70 font-medium leading-relaxed">
              System-wide settings affect all connected analysts and ingestion pipelines. Ensure you have the appropriate clearance level before modifying grid parameters.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function SettingCard({ icon, title, desc, action }) {
  return (
    <div className="enterprise-card p-6 flex flex-col justify-between group hover:border-blue-500/30 transition-all cursor-pointer">
      <div className="space-y-4">
        <div className="p-3 bg-slate-900 border border-siem-border rounded-xl w-fit group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{title}</h4>
          <p className="text-[11px] text-siem-muted font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-siem-border flex justify-end">
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{action}</span>
      </div>
    </div>
  );
}
