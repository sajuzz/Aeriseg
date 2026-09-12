import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const ActionHistoryTable = ({ actions, loading }) => {
  if (loading) return <div className="text-[10px] text-siem-muted font-bold uppercase tracking-widest py-8 text-center animate-pulse">Syncing actions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-siem-muted uppercase tracking-widest">Execution History</h4>
      </div>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {actions.length === 0 && (
          <div className="text-[11px] text-siem-muted py-10 text-center border border-dashed border-siem-border rounded-xl bg-siem-bg/50 italic">
            No containment actions have been executed yet.
          </div>
        )}
        
        {actions.map((action) => (
          <div key={action.id} className="p-3 bg-siem-panel border border-siem-border rounded-xl shadow-sm hover:border-siem-border transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight truncate">
                  {action.action_type.replace('_', ' ')}
                </div>
                <div className="text-[10px] font-mono text-siem-muted mt-1 truncate">{action.target_value}</div>
              </div>
              <div className="ml-2">
                <StatusIndicator status={action.status} />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
              <span className="text-[9px] text-siem-muted font-bold uppercase">{action.actor}</span>
              <span className="text-[9px] text-siem-muted">{new Date(action.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function StatusIndicator({ status }) {
  switch(status) {
    case 'EXECUTED':
      return <div className="bg-green-50 text-green-600 p-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /></div>;
    case 'FAILED':
      return <div className="bg-red-50 text-red-600 p-1 rounded-full"><XCircle className="w-3.5 h-3.5" /></div>;
    case 'DRY_RUN':
      return <div className="bg-blue-50 text-blue-600 p-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5 opacity-60" /></div>;
    case 'SKIPPED':
      return <div className="bg-siem-bg text-siem-muted p-1 rounded-full"><XCircle className="w-3.5 h-3.5 opacity-40" /></div>;
    default:
      return <div className="bg-amber-50 text-amber-600 p-1 rounded-full animate-spin"><Clock className="w-3.5 h-3.5" /></div>;
  }
}


export default ActionHistoryTable;
