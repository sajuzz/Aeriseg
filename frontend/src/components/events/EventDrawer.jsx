import React, { useState } from 'react';
import { X, Terminal, Sparkles, Code, FileText, Link as LinkIcon, Info } from 'lucide-react';
import { useEventDrawerStore } from '../../store/useEventDrawerStore';
import EventOverviewTab from './EventOverviewTab';
import EventRawLogTab from './EventRawLogTab';
import EventJsonTab from './EventJsonTab';
import EventCorrelationsTab from './EventCorrelationsTab';
import EventInvestigationContext from './EventInvestigationContext';

export default function EventDrawer({ onPivot }) {
  const { isOpen, selectedEvent, contextType, closeDrawer, openDrawer } = useEventDrawerStore();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !selectedEvent) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'raw', label: 'Raw Log', icon: Terminal },
    { id: 'json', label: 'JSON', icon: Code },
    { id: 'correlations', label: 'Correlations', icon: Sparkles },
    { id: 'investigation', label: 'Investigation', icon: LinkIcon },
  ];

  const handleOpenCorrelation = (corr) => {
    // Open a new event in the drawer (recursive inspection)
    openDrawer(corr, 'correlation');
    setActiveTab('overview');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-[100] transition-opacity duration-300"
        onClick={closeDrawer}
      />
      
      {/* Drawer Container */}
      <div className="fixed top-0 right-0 h-full w-[550px] bg-siem-panel shadow-[-20px_0_50px_-12px_rgba(0,0,0,0.15)] z-[101] flex flex-col border-l border-siem-border animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-siem-border flex items-center justify-between bg-siem-bg/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-md shadow-blue-200">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm tracking-tight">Event Inspection</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] text-siem-muted font-bold uppercase tracking-wider">
                  Opened from: {contextType.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={closeDrawer}
            className="p-2 hover:bg-slate-200 rounded-full transition-all text-siem-muted hover:text-siem-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-siem-border px-4 bg-siem-panel sticky top-0 z-10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative ${
                activeTab === tab.id ? 'text-blue-600' : 'text-siem-muted hover:text-siem-muted'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-siem-panel custom-scrollbar">
          {activeTab === 'overview' && (
            <EventOverviewTab event={selectedEvent} onPivot={onPivot} />
          )}
          {activeTab === 'raw' && (
            <EventRawLogTab event={selectedEvent} />
          )}
          {activeTab === 'json' && (
            <EventJsonTab event={selectedEvent} />
          )}
          {activeTab === 'correlations' && (
            <EventCorrelationsTab eventId={selectedEvent.event_id} onOpenEvent={handleOpenCorrelation} />
          )}
          {activeTab === 'investigation' && (
            <EventInvestigationContext eventId={selectedEvent.event_id} />
          )}
        </div>

        {/* Unified Footer Actions */}
        <div className="p-4 bg-siem-bg border-t border-siem-border flex gap-3">
           <div className="flex-1 text-[10px] text-siem-muted font-medium italic">
             Reviewing forensic telemetry in isolation. 
           </div>
        </div>
      </div>
    </>
  );
}
