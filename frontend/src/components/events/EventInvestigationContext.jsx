import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LinkIcon, Plus, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EventInvestigationContext({ eventId }) {
  const [investigations, setInvestigations] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get('/api/investigations').then(res => {
      setInvestigations(res.data.filter(i => i.status !== 'CLOSED'));
    });
  }, []);

  const handleLink = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await axios.post(`/api/investigations/${selected}/events`, { event_ids: [eventId] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-800">
          <LinkIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-widest">Evidence Promotion</h3>
        </div>
        
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
          Promote this telemetry into a formal investigation to track activity timelines and link related findings.
        </p>

        <div className="space-y-3">
          <select 
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select active investigation...</option>
            {investigations.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.title} ({inv.status})</option>
            ))}
          </select>
          <button 
            onClick={handleLink}
            disabled={!selected || loading}
            className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase transition-all shadow-md flex items-center justify-center gap-2 ${
              success ? 'bg-green-600 text-white' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {loading ? 'Linking...' : success ? 'Evidence Linked!' : (
              <>
                <Plus className="w-3.5 h-3.5" /> Attach as Evidence
              </>
            )}
          </button>
        </div>
      </section>

      <section>
         <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Case History</h3>
         <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-200">
            <Info className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-[10px] text-slate-400">This event has not been linked to any previous cases.</p>
         </div>
      </section>
    </div>
  );
}
