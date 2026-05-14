import React from 'react';
import { Terminal } from 'lucide-react';

export default function EventRawLogTab({ event }) {
  const rawMsg = event.raw_log?.message || event.raw_log?.raw || JSON.stringify(event.raw_log);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-center gap-2 mb-2 text-slate-500">
        <Terminal className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Original Telemetry Stream</span>
      </div>
      <div className="bg-slate-900 rounded-xl p-6 font-mono text-[13px] text-slate-300 leading-relaxed shadow-inner border border-slate-800">
        {rawMsg}
      </div>
      <p className="text-[10px] text-slate-400 italic">
        This is the verbatim log entry as received by the MediShield ingest pipeline.
      </p>
    </div>
  );
}
