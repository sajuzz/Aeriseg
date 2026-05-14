import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Shield, Terminal, 
  MessageSquare, FileText, ChevronRight, 
  Plus, CheckCircle, Play, Download,
  AlertTriangle, User, Activity, MoreVertical,
  ArrowRight
} from 'lucide-react';

import { useEventDrawerStore } from '../store/useEventDrawerStore';
import UnifiedTimeline from '../components/investigations/UnifiedTimeline';
import ResponseActionPanel from '../components/investigations/ResponseActionPanel';
import StatusBadge from '../components/StatusBadge';
import CorrelationGraph from './CorrelationGraph';
import EvidenceLocker from '../components/investigations/EvidenceLocker';

export default function InvestigationDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('timeline');
  const openDrawer = useEventDrawerStore(state => state.openDrawer);

  const fetchDetails = async () => {
    try {
      const res = await axios.get(`/api/investigations/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const updateStatus = async (status) => {
    try {
      await axios.patch(`/api/investigations/${id}/status`, { status });
      fetchDetails();
    } catch (err) {
      alert(err.response?.data?.detail || "Status update failed");
    }
  };

  const updatePriority = async (priority) => {
    try {
      await axios.patch(`/api/investigations/${id}/priority`, { priority });
      fetchDetails();
    } catch (err) {
       console.error(err);
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await axios.post(`/api/investigations/${id}/notes`, { content: noteContent });
      setNoteContent("");
      fetchDetails();
      setTimelineRefresh(prev => prev + 1);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-siem-muted font-black uppercase tracking-widest">Initalizing Case Workflow...</div>;
  if (!data) return <div className="p-10 text-center text-siem-critical font-bold">Investigation Not Found</div>;

  const { investigation, events, timeline, notes } = data;

  const STATUS_WORKFLOW = [
    'NEW', 'TRIAGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE'
  ];

  const PRIORITY_LEVELS = [
    { label: 'CRITICAL', color: 'text-siem-critical' },
    { label: 'HIGH', color: 'text-siem-high' },
    { label: 'MEDIUM', color: 'text-siem-medium' },
    { label: 'LOW', color: 'text-siem-low' }
  ];

  return (
    <div className="space-y-6 max-w-full">
      
      {/* ── Case Header ─────────────────────────────────────────────────── */}
      <div className="enterprise-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link to="/investigations" className="p-3 bg-slate-900 border border-siem-border rounded-xl hover:bg-siem-border/20 transition-all">
            <ArrowLeft className="w-5 h-5 text-siem-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <StatusBadge status={investigation.status} />
              <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-siem-border bg-slate-950 ${
                investigation.priority === 'CRITICAL' ? 'text-siem-critical border-siem-critical/30' : 'text-siem-muted'
              }`}>
                {investigation.priority || 'MEDIUM'} PRIORITY
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">{investigation.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-siem-muted uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-blue-500"/> CASE ID: {investigation.id}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-500"/> CREATED: {new Date(investigation.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={investigation.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="bg-slate-900 border border-siem-border text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {STATUS_WORKFLOW.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={() => updateStatus('RESOLVED')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Resolve Case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ── Main Investigation Area (Center/Left) ────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          
          <div className="enterprise-card overflow-hidden flex flex-col min-h-[600px]">
            <div className="bg-slate-900 p-4 border-b border-siem-border flex items-center justify-between">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 pb-1 border-b-2 transition-all ${
                    activeTab === 'timeline' ? 'text-white border-blue-500' : 'text-siem-muted border-transparent hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-500" /> Narrative Timeline
                </button>
                <button 
                  onClick={() => setActiveTab('graph')}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 pb-1 border-b-2 transition-all ${
                    activeTab === 'graph' ? 'text-white border-blue-500' : 'text-siem-muted border-transparent hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 text-blue-500" /> Correlation Graph
                </button>
                <button 
                  onClick={() => setActiveTab('evidence')}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 pb-1 border-b-2 transition-all ${
                    activeTab === 'evidence' ? 'text-white border-blue-500' : 'text-siem-muted border-transparent hover:text-white'
                  }`}
                >
                  <Database className="w-4 h-4 text-emerald-500" /> Evidence Locker
                </button>
              </div>
              <button 
                onClick={() => setTimelineRefresh(prev => prev + 1)}
                className="text-[9px] font-black text-siem-muted hover:text-white uppercase tracking-widest transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
               {activeTab === 'timeline' ? (
                 <UnifiedTimeline investigationId={id} refreshTrigger={timelineRefresh} />
               ) : activeTab === 'graph' ? (
                 <CorrelationGraph />
               ) : (
                 <EvidenceLocker investigationId={id} artifacts={details?.artifacts || []} onUpdate={fetchDetails} />
               )}
            </div>
          </div>

          {/* Observations / Technical Notes */}
          <div className="enterprise-card">
            <div className="p-4 border-b border-siem-border flex items-center justify-between bg-slate-900/30">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" /> Technical Observations
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {notes?.map(note => (
                  <div key={note.id} className="bg-slate-950 border border-siem-border rounded-xl p-4 space-y-2 group">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-siem-muted">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="text-white">{note.username || 'System'}</span>
                        <span className="opacity-50">· {new Date(note.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-siem-text leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
                {(!notes || notes.length === 0) && (
                  <div className="text-center py-10 opacity-30">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No observations recorded</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <textarea 
                  className="w-full bg-slate-900 border border-siem-border rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-siem-muted"
                  placeholder="Record forensic analysis or investigation notes..."
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="absolute right-3 bottom-3">
                  <button 
                    onClick={addNote}
                    disabled={!noteContent.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-20"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar (Right) ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          
          {/* Case Control Panel */}
          <div className="enterprise-card p-6 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-siem-muted uppercase tracking-[0.2em] mb-4">Case Controls</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-siem-muted uppercase tracking-widest">Assign Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_LEVELS.map(p => (
                      <button 
                        key={p.label}
                        onClick={() => updatePriority(p.label)}
                        className={`text-[9px] font-black p-2 rounded-lg border transition-all ${
                          investigation.priority === p.label 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/30' 
                            : 'bg-slate-900 border-siem-border text-siem-muted hover:border-blue-500/50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-siem-border">
                   <button 
                     onClick={() => handleExport('md')}
                     className="w-full px-4 py-3 bg-slate-900 border border-siem-border text-siem-text rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-siem-border/20 transition-all flex items-center justify-between"
                   >
                     Export Forensic Report <Download className="w-3.5 h-3.5 text-blue-400" />
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* SOAR Action Panel */}
          <div className="enterprise-card min-h-[300px]">
             <ResponseActionPanel 
               investigationId={id} 
               onActionExecuted={() => setTimelineRefresh(prev => prev + 1)} 
             />
          </div>

          {/* Evidence Collection */}
          <div className="enterprise-card flex flex-col h-[400px]">
            <div className="px-6 py-4 border-b border-siem-border flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Evidence ({events?.length || 0})</h3>
              </div>
              <Link to="/hunt" className="text-[9px] text-blue-400 font-black hover:text-white uppercase tracking-widest transition-colors">Add</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {events?.map(event => (
                 <div 
                   key={event.event_id} 
                   onClick={() => openDrawer(event, 'investigation', id)}
                   className="p-4 bg-slate-950 border border-siem-border rounded-xl hover:border-blue-500/50 hover:bg-siem-border/10 transition-all cursor-pointer group"
                 >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black text-siem-muted font-mono uppercase tracking-tighter">{event.source}</span>
                      <StatusBadge status={event.severity} />
                    </div>
                    <div className="text-[11px] font-black text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{event.event_type}</div>
                    <div className="flex items-center justify-between">
                       <div className="text-[10px] text-siem-muted font-mono">{event.source_ip}</div>
                       <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-blue-400" />
                    </div>
                 </div>
               ))}
               {(!events || events.length === 0) && (
                 <div className="text-center py-10 opacity-20">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[9px] font-black uppercase">No evidence attached</p>
                 </div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status) {
  const styles = {
    'NEW': 'bg-red-950/30 text-red-500 border-red-900/50',
    'TRIAGED': 'bg-amber-950/30 text-amber-500 border-amber-900/50',
    'INVESTIGATING': 'bg-blue-950/30 text-blue-500 border-blue-900/50',
    'CONTAINED': 'bg-purple-950/30 text-purple-500 border-purple-900/50',
    'RESOLVED': 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50',
    'FALSE_POSITIVE': 'bg-slate-900 text-siem-muted border-siem-border'
  };
  return styles[status] || styles['NEW'];
}
