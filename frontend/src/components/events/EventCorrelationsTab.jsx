import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ArrowRight, ShieldAlert, Info } from 'lucide-react';

export default function EventCorrelationsTab({ eventId, onOpenEvent }) {
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCorrelations = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/events/${eventId}/correlations`);
        setCorrelations(res.data.data);
      } catch (err) {
        console.error("Failed to fetch correlations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCorrelations();
  }, [eventId]);

  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <Sparkles className="w-6 h-6 text-blue-400 mx-auto mb-2 animate-bounce" />
        <p className="text-xs text-siem-muted font-medium">Scoring correlations...</p>
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="p-10 text-center text-siem-muted">
        <Info className="w-8 h-8 opacity-20 mx-auto mb-3" />
        <p className="text-xs italic">No significant correlations found for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-4 flex items-center gap-3">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
          <Sparkles className="w-3 h-3" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Correlation Engine</div>
          <div className="text-[10px] text-blue-600 font-medium">Found {correlations.length} related security events</div>
        </div>
      </div>

      {correlations.map(corr => (
        <div 
          key={corr.event_id}
          onClick={() => onOpenEvent(corr)}
          className="group p-4 bg-siem-panel border border-siem-border rounded-xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          {/* Score Indicator */}
          <div className="absolute top-0 right-0 p-2">
             <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getScoreStyle(corr.score)}`}>
               {corr.score}% Match
             </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-siem-muted uppercase tracking-widest">{corr.source}</span>
            <span className="text-slate-200">•</span>
            <span className="text-[10px] font-medium text-siem-muted">{new Date(corr.timestamp).toLocaleTimeString()}</span>
          </div>

          <div className="text-xs font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
            {corr.event_type}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {corr.reasons.map(reason => (
              <span key={reason} className="text-[9px] bg-slate-100 text-siem-muted px-1.5 py-0.5 rounded font-bold uppercase border border-siem-border/50">
                {reason.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
             <span className="text-[10px] font-mono text-blue-600 font-semibold">{corr.source_ip}</span>
             <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getScoreStyle(score) {
  if (score >= 80) return "bg-red-100 text-red-700 border border-red-200";
  if (score >= 50) return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-blue-100 text-blue-700 border border-blue-200";
}
