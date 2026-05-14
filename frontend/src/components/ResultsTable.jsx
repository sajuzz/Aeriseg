import React from 'react';
import { Shield, Terminal, Activity, Clock } from 'lucide-react';
import { useEventDrawerStore } from '../store/useEventDrawerStore';

export default function ResultsTable({ events, loading }) {
  const openDrawer = useEventDrawerStore(state => state.openDrawer);

  if (loading) {
    return (
      <div className="enterprise-card p-12 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-siem-muted text-sm font-bold uppercase tracking-widest">Executing ASQL Query...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="enterprise-card p-12 text-center text-siem-muted">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p className="text-sm font-bold uppercase tracking-widest">No telemetry records found</p>
      </div>
    );
  }

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="siem-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Source</th>
              <th>Event Type</th>
              <th>Source IP</th>
              <th>Severity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, idx) => (
              <tr
                key={event.event_id || idx}
                className="hover:bg-siem-border/20 cursor-pointer transition-colors"
                onClick={() => openDrawer(event, 'threat_hunt')}
              >
                <td className="siem-mono text-siem-muted whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                </td>
                <td>
                  <span className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 text-[10px] font-black uppercase border border-blue-900/50">
                    {event.source}
                  </span>
                </td>
                <td className="text-siem-text font-bold">{event.event_type}</td>
                <td className="siem-mono text-blue-400 font-bold">{event.source_ip}</td>
                <td>
                  <SeverityBadge severity={event.severity} />
                </td>
                <td className="siem-mono text-siem-muted truncate max-w-xs">
                  {event.rule_name ? `[${event.rule_name}] ` : ''}
                  {JSON.stringify(event.raw_log)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: "bg-red-950/40 text-red-500 border-red-900/50",
    high: "bg-orange-950/40 text-orange-500 border-orange-900/50",
    medium: "bg-blue-950/40 text-blue-500 border-blue-900/50",
    low: "bg-emerald-950/40 text-emerald-500 border-emerald-900/50",
    info: "bg-slate-900/50 text-siem-muted border-siem-border"
  };

  const current = styles[severity?.toLowerCase()] || styles.info;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${current}`}>
      {severity}
    </span>
  );
}
