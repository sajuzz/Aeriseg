import React, { useState } from 'react';
import axios from 'axios';
import { 
  FileText, Image as ImageIcon, Camera, 
  Terminal, Shield, Trash2, Plus, 
  Database, Info, ExternalLink, Package
} from 'lucide-react';

export default function EvidenceLocker({ investigationId, artifacts, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [newArt, setNewArt] = useState({ type: 'LOG_FILE', description: '', content: '' });

  const handleAdd = async () => {
    try {
      await axios.post(`/api/investigations/${investigationId}/artifacts`, {
        artifact_type: newArt.type,
        description: newArt.description,
        content: newArt.content
      });
      setAdding(false);
      setNewArt({ type: 'LOG_FILE', description: '', content: '' });
      onUpdate();
    } catch (err) {
      alert("Failed to add artifact");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="p-4 border-b border-siem-border flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Forensic Vault</span>
        </div>
        <button 
          onClick={() => setAdding(true)}
          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Evidence
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {adding && (
          <div className="enterprise-card p-6 bg-slate-900 border-emerald-500/30">
             <h4 className="text-[10px] font-black text-white uppercase mb-4">New Forensic Artifact</h4>
             <div className="space-y-4">
               <div>
                 <label className="text-[9px] font-bold text-siem-muted uppercase block mb-1">Type</label>
                 <select 
                   value={newArt.type}
                   onChange={e => setNewArt({...newArt, type: e.target.value})}
                   className="w-full bg-slate-950 border border-siem-border rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500"
                 >
                   <option value="LOG_FILE">Log Snippet</option>
                   <option value="SCREENSHOT">System Screenshot</option>
                   <option value="PCAP_SNIPPET">Packet Capture</option>
                   <option value="FORENSIC_NOTE">Forensic Observation</option>
                 </select>
               </div>
               <div>
                 <label className="text-[9px] font-bold text-siem-muted uppercase block mb-1">Description</label>
                 <input 
                   type="text" 
                   value={newArt.description}
                   onChange={e => setNewArt({...newArt, description: e.target.value})}
                   placeholder="e.g. Malicious process injection log"
                   className="w-full bg-slate-950 border border-siem-border rounded-lg p-2 text-xs text-white outline-none focus:border-emerald-500"
                 />
               </div>
               <div>
                 <label className="text-[9px] font-bold text-siem-muted uppercase block mb-1">Raw Content / Data</label>
                 <textarea 
                   rows="4"
                   value={newArt.content}
                   onChange={e => setNewArt({...newArt, content: e.target.value})}
                   className="w-full bg-slate-950 border border-siem-border rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                 />
               </div>
               <div className="flex justify-end gap-2">
                 <button onClick={() => setAdding(false)} className="px-4 py-2 text-[9px] font-black text-siem-muted uppercase hover:text-white">Cancel</button>
                 <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">Persist Evidence</button>
               </div>
             </div>
          </div>
        )}

        {artifacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {artifacts.map(art => (
              <div key={art.id} className="enterprise-card p-4 hover:border-emerald-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 border border-siem-border rounded-lg group-hover:border-emerald-500/50 transition-colors">
                      {art.artifact_type === 'SCREENSHOT' ? <ImageIcon className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-white uppercase tracking-tight">{art.description}</h5>
                      <span className="text-[8px] text-siem-muted font-bold uppercase">{art.artifact_type} · {new Date(art.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-siem-muted group-hover:text-white cursor-pointer" />
                </div>
                {art.content && (
                  <div className="bg-slate-950 p-2 rounded-lg border border-siem-border/50 text-[10px] text-siem-muted font-mono truncate max-h-12">
                    {art.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-siem-muted opacity-20">
            <Package className="w-12 h-12 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Vault Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}
