import React from 'react';
import { Code } from 'lucide-react';

export default function EventJsonTab({ event }) {
  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    alert("JSON copied to clipboard");
  };

  return (
    <div className="space-y-4 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-500">
          <Code className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">JSON Payload</span>
        </div>
        <button 
          onClick={copyJson}
          className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
        >
          Copy Payload
        </button>
      </div>
      <div className="bg-slate-950 rounded-xl p-5 font-mono text-[11px] text-blue-300/90 overflow-x-auto shadow-2xl border border-slate-800">
        <pre>{JSON.stringify(event, null, 2)}</pre>
      </div>
    </div>
  );
}
