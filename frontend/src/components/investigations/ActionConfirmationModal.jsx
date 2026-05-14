import React, { useState } from 'react';
import { X, ShieldAlert, Zap } from 'lucide-react';

const ActionConfirmationModal = ({ isOpen, actionType, onClose, onConfirm }) => {
  const [targetValue, setTargetValue] = useState('');
  const [notes, setNotes] = useState('');
  const [dryRun, setDryRun] = useState(true); // Default to dry run for safety


  if (!isOpen) return null;

  const actionLabels = {
    BLOCK_IP: "Block IP Address",
    MARK_IOC: "Mark as Malicious IOC",
    NOTIFY_WEBHOOK: "Send Webhook Notification",
  };

  const handleSubmit = () => {
    if (!targetValue.trim()) return;
    onConfirm(targetValue.trim(), notes.trim(), dryRun);
    setTargetValue('');
    setNotes('');
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
           <div className="bg-red-100 p-2 rounded-lg">
             <ShieldAlert className="w-5 h-5 text-red-600" />
           </div>
           <h2 className="text-xl font-bold text-slate-900 tracking-tight">{actionLabels[actionType] || "Execute Action"}</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Target Identifier
            </label>
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={actionType === 'BLOCK_IP' ? "192.168.1.45" : "e.g. SHA256 / Domain"}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Reasoning / Justification
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm"
              placeholder="Explain the technical rationale for this containment action..."
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer select-none" onClick={() => setDryRun(!dryRun)}>
             <input 
               type="checkbox" 
               checked={dryRun} 
               onChange={() => {}}
               className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
             />
             <div>
               <div className="text-xs font-bold text-blue-800">Simulation Mode (Dry Run)</div>
               <div className="text-[10px] text-blue-600">Action will be logged but not sent to external APIs</div>
             </div>
          </div>
        </div>

        <div className="flex gap-3 mt-10">

          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetValue.trim()}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" /> Execute
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          This action will be immutable and recorded in the audit log.
          <span className="w-1 h-1 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
};

export default ActionConfirmationModal;
