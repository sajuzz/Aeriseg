import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Shield, Activity, Plus, CheckCircle2, 
  Clock, Server, Cpu, Network, Monitor, Zap
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Network':    <Network className="w-5 h-5 text-blue-500" />,
  'Endpoint':   <Monitor className="w-5 h-5 text-indigo-500" />,
  'Healthcare': <Activity className="w-5 h-5 text-emerald-500" />,
  'OT/ICS':     <Cpu className="w-5 h-5 text-amber-500" />,
  'IoT':        <Zap className="w-5 h-5 text-purple-500" />,
};

export default function DataSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await axios.get('/api/v1/ingest/sources');
        setSources(res.data.data);
      } catch (err) {
        console.error("Failed to fetch sources", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Telemetry Sources</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Manage ingestion connectors and normalized parsers</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Request Connector
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-white border border-slate-200 rounded-3xl animate-pulse" />
          ))
        ) : (
          sources.map(source => (
            <div 
              key={source.id} 
              className={`bg-white border p-6 rounded-3xl shadow-sm transition-all hover:shadow-md relative overflow-hidden group
                ${source.status === 'active' ? 'border-slate-200' : 'border-slate-100 opacity-80'}`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {source.status === 'active' ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Planned</span>
                  </div>
                )}
              </div>

              {/* Icon & Name */}
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl w-fit group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
                  {CATEGORY_ICONS[source.category] || <Server className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">{source.name}</h3>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{source.category} Provider</div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {source.status === 'active' 
                    ? `Live ${source.category} telemetry being ingested and normalized into AeriSeg Common Schema.`
                    : `Parser logic for ${source.name} is in development. Modular architecture is ready for mapping.`
                  }
                </p>
              </div>

              {/* Action */}
              <div className="mt-6">
                <button 
                  disabled={source.status !== 'active'}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all
                    ${source.status === 'active'
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                      : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                >
                  {source.status === 'active' ? 'View Live Stream' : 'Notify on Release'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Architecture Note */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield className="w-48 h-48" />
        </div>
        <div className="max-w-2xl relative">
          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Normalization Principle</h4>
          <h2 className="text-2xl font-black tracking-tight mb-4 leading-tight">
            Independent of Source. Unified in Defense.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            AeriSeg utilizes a <strong>Modular Parser Registry</strong>. Every data source, whether it's an 
            MRI machine (HL7), a Power Grid PLC (Modbus), or a Windows Workstation (Sysmon), is normalized 
            into our <strong>Common Event Schema</strong> before detection.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
              Schema-Driven
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
              Vendor-Agnostic
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
