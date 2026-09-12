import React, { useState, useEffect } from 'react';
import ActionConfirmationModal from './ActionConfirmationModal';
import ActionHistoryTable from './ActionHistoryTable';
import { Zap, Shield, ShieldAlert, BellRing } from 'lucide-react';
import axios from 'axios';

const ResponseActionPanel = ({ investigationId, onActionExecuted }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  const suggestedActions = [
    { type: "BLOCK_IP", label: "Block Source IP", icon: <ShieldAlert className="w-5 h-5" />, desc: "Instantly drop traffic from target" },
    { type: "MARK_IOC", label: "Tag Malicious IOC", icon: <Shield className="w-5 h-5" />, desc: "Update threat intel repository" },
    { type: "NOTIFY_WEBHOOK", label: "Escalate to SOC", icon: <BellRing className="w-5 h-5" />, desc: "Trigger external automation" },
  ];

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/investigations/${investigationId}/actions`);
      setActions(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [investigationId]);

  const handleActionClick = (actionType) => {
    setSelectedAction(actionType);
    setShowModal(true);
  };

  const handleActionConfirmed = async (targetValue, notes, dryRun = false) => {
    try {
      await axios.post(`/api/investigations/${investigationId}/actions`, {
        action_type: selectedAction,
        target_type: selectedAction === 'BLOCK_IP' ? 'IP' : 'IOC',
        target_value: targetValue,
        notes: notes,
        dry_run: dry_run
      });


      setShowModal(false);
      fetchActions();
      onActionExecuted(); // Refresh timeline in parent
    } catch (err) {
      alert("Action execution failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-siem-border bg-siem-bg/50 flex items-center gap-2">
         <Zap className="w-4 h-4 text-red-500 fill-red-500" />
         <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Containment Strategy</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Suggested Quick Actions */}
        <div className="space-y-3">
          {suggestedActions.map((act) => (
            <button
              key={act.type}
              onClick={() => handleActionClick(act.type)}
              className="w-full flex items-center gap-4 p-4 bg-siem-panel border border-siem-border hover:border-red-400 hover:bg-red-50/30 rounded-2xl text-left transition-all group shadow-sm"
            >
              <div className="p-2.5 bg-siem-bg rounded-xl group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                {act.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-xs group-hover:text-red-700 transition-colors uppercase tracking-tight">{act.label}</div>
                <div className="text-[10px] text-siem-muted mt-0.5 font-medium">{act.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <hr className="border-siem-border" />

        {/* Action History */}
        <ActionHistoryTable 
          actions={actions} 
          loading={loading} 
        />
      </div>

      <ActionConfirmationModal
        isOpen={showModal}
        actionType={selectedAction}
        onClose={() => setShowModal(false)}
        onConfirm={handleActionConfirmed}
      />
    </div>
  );
};

export default ResponseActionPanel;
