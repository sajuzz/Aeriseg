import { Clock, RefreshCw, AlertCircle, FileText, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

const UnifiedTimeline = ({ investigationId, refreshTrigger }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const openDrawer = useEventDrawerStore(state => state.openDrawer);


  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/investigations/${investigationId}/timeline`);
      const data = await res.json();
      setTimeline(data.data || []);
    } catch (err) {
      console.error("Failed to fetch timeline", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [investigationId, refreshTrigger]);


  if (loading) {
    return (
      <div className="p-12 text-center text-siem-muted font-medium animate-pulse">
        <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-20" />
        Loading narrative...
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-siem-border rounded-2xl bg-siem-bg/30 m-6">
        <div className="bg-siem-panel w-12 h-12 rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-siem-border">
           <FileText className="w-6 h-6 text-slate-300" />
        </div>
        <h4 className="text-slate-800 font-bold text-sm mb-1">No activity narrative yet</h4>
        <p className="text-xs text-siem-muted max-w-[200px] mx-auto leading-relaxed">Add evidence or analyst notes to build the chronological case history.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-siem-panel">
      <div className="px-8 py-6 border-b border-siem-border flex items-center justify-between sticky top-0 bg-siem-panel/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
           <div className="bg-blue-50 p-2 rounded-lg">
             <Clock className="w-4 h-4 text-blue-600" />
           </div>
           <div>
             <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Investigation Narrative</h3>
             <p className="text-[10px] text-siem-muted font-bold uppercase tracking-widest mt-0.5">Chronological Ground Truth</p>
           </div>
        </div>
        <button 
          onClick={fetchTimeline}
          className="p-2 hover:bg-slate-100 rounded-full transition-all text-siem-muted hover:text-blue-600 group"
          title="Refresh Narrative"
        >
          <RefreshCw className="w-4 h-4 group-active:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="relative pl-10 border-l-2 border-siem-border space-y-12">
          {timeline.map((entry, index) => (
            <div key={entry.id} className="relative group">
              {/* Timeline Indicator */}
              <div className={`absolute -left-[51px] top-0 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${getIconBg(entry)}`}>
                {getIcon(entry)}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-siem-muted uppercase tracking-widest bg-siem-bg px-2 py-0.5 rounded border border-siem-border">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
              </div>

              <div className="bg-siem-panel group-hover:bg-siem-bg/50 transition-all rounded-xl p-2 -m-2">
                <div className="flex flex-col gap-1">
                  <div className="font-bold text-siem-text text-sm tracking-tight flex items-center gap-2">
                    {entry.title}
                    {entry.severity && <StatusBadge status={entry.severity} />}
                  </div>
                  
                  <div className="text-[13px] text-siem-muted mt-1.5 leading-relaxed font-medium">
                    {entry.description}
                  </div>

                  {entry.event_summary && (
                    <div className="flex items-center gap-2 mt-3">
                       <div className="text-[10px] font-mono bg-slate-100 text-siem-muted px-2 py-1 rounded border border-siem-border">
                         {entry.event_summary}
                       </div>
                    </div>
                  )}

                  {entry.type === 'EVIDENCE' && entry.event_id && (
                    <button
                      onClick={() => openDrawer({ event_id: entry.event_id }, 'investigation')}
                      className="mt-4 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-all group/btn"
                    >
                      Inspect Evidence Details
                      <RefreshCw className="w-3 h-3 group-hover/btn:rotate-90 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getIcon(entry) {
  if (entry.type === 'EVIDENCE') return <ShieldCheck className="w-4 h-4 text-white" />;
  if (entry.activity_type === 'ACTION_EXECUTED') return <Zap className="w-4 h-4 text-white" />;
  switch(entry.icon) {
    case 'note': return <MessageSquare className="w-4 h-4 text-white" />;
    case 'status': return <RefreshCw className="w-4 h-4 text-white" />;
    case 'created': return <AlertCircle className="w-4 h-4 text-white" />;
    default: return <FileText className="w-4 h-4 text-white" />;
  }
}

function getIconBg(entry) {
  if (entry.type === 'EVIDENCE') return 'bg-red-500 shadow-red-100';
  if (entry.activity_type === 'ACTION_EXECUTED') return 'bg-red-600 shadow-red-100';
  switch(entry.icon) {
    case 'note': return 'bg-amber-500 shadow-amber-100';
    case 'status': return 'bg-slate-800 shadow-slate-100';
    case 'created': return 'bg-blue-600 shadow-blue-100';
    default: return 'bg-blue-500 shadow-blue-100';
  }
}


export default UnifiedTimeline;
