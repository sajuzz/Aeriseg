import React, { useState, useEffect } from 'react';
import { Filter, Server } from 'lucide-react';
import axios from 'axios';
import StatusBadge from '../StatusBadge';


export default function EventOverviewTab({ event, onPivot }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <h3 className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-3">Normalized Fields</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetaField label="Event ID" value={event.event_id} />
          <MetaField label="Timestamp" value={new Date(event.timestamp).toLocaleString()} />
          <MetaField label="Source" value={event.source} onPivot={onPivot} pivotKey="source" />
          <MetaField label="Source IP" value={event.source_ip} onPivot={onPivot} pivotKey="source_ip" />
          <MetaField label="Severity" value={event.severity} onPivot={onPivot} pivotKey="severity" />
          <MetaField label="Event Type" value={event.event_type} onPivot={onPivot} pivotKey="event_type" />
        </div>
      </section>

      {/* Asset CMDB Enrichment */}
      {event.source_ip && <AssetContext ipAddress={event.source_ip} />}
      

      {event.raw_log?.message && (
        <section>
           <h3 className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-3">Message Summary</h3>
           <div className="p-3 bg-siem-bg border border-siem-border rounded-lg text-sm text-siem-text leading-relaxed font-medium">
             {event.raw_log.message}
           </div>
        </section>
      )}
    </div>
  );
}

function MetaField({ label, value, onPivot, pivotKey }) {
  return (
    <div className="space-y-1 group">
      <div className="text-[9px] font-bold text-siem-muted uppercase">{label}</div>
      <div className="flex items-center justify-between bg-siem-bg p-2 rounded border border-siem-border hover:border-blue-200 transition-colors">
        <span className="text-xs font-mono text-siem-text truncate mr-2">{value}</span>
        {onPivot && (
          <button 
            onClick={() => onPivot(pivotKey, value)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 text-blue-600 rounded transition-all"
            title={`Pivot on ${label}`}
          >
            <Filter className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function AssetContext({ ipAddress }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/assets/enrich/${ipAddress}`);
        if (res.data.status === 'success' && res.data.data) {
          setAsset(res.data.data);
        } else {
          setAsset(null);
        }
      } catch (err) {
        setAsset(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [ipAddress]);

  if (loading) return <div className="h-20 animate-pulse bg-siem-bg rounded-lg border border-siem-border"></div>;
  if (!asset) return null; // Silently hide if no asset context found

  return (
    <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
         <Server className="w-16 h-16 text-indigo-900" />
      </div>
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Server className="w-4 h-4 text-indigo-600" />
        <h3 className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">CMDB Asset Context</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3 gap-x-6 relative z-10">
        <div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase">Hostname</div>
          <div className="text-xs font-bold text-indigo-900 mt-0.5">{asset.hostname || "Unknown"}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase">Criticality</div>
          <div className="mt-1"><StatusBadge status={asset.criticality?.toUpperCase()} /></div>
        </div>
        <div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase">Asset Type</div>
          <div className="text-xs font-medium text-indigo-800 mt-0.5">{asset.asset_type || "N/A"}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase">Owner / Dept</div>
          <div className="text-xs font-medium text-indigo-800 mt-0.5">{asset.department || "N/A"}</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">{asset.owner || "N/A"}</div>
        </div>
      </div>
    </section>
  );
}
