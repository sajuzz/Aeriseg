import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileCode, Plus, Save, Trash2, Shield, Search, X, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import StatusBadge from '../components/StatusBadge';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [search, setSearch] = useState('');
  const user = useAuthStore(state => state.user);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rules');
      setRules(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleEdit = async (rule) => {
    try {
      const res = await axios.get(`/api/rules/${rule._filename}`);
      setEditingRule(rule);
      setEditedContent(res.data.content);
    } catch (err) {
      alert("Failed to load rule content");
    }
  };

  const handleSave = async () => {
    if (!editedContent) return;
    try {
      // Very basic yaml parsing logic or just send raw content to a different endpoint
      // For simplicity, let's assume our backend handles raw content if we add an endpoint, 
      // or we just send the filename + raw content.
      
      // I'll update the backend to handle a 'raw' update
      await axios.post('/api/rules', {
        _filename: editingRule._filename,
        ...editingRule, // placeholder
        _raw: editedContent
      });

      alert("Rule saved successfully");
      fetchRules();
      setEditingRule(null);
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await axios.delete(`/api/rules/${filename}`);
      fetchRules();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const filteredRules = rules.filter(r => 
    r.title?.toLowerCase().includes(search.toLowerCase()) || 
    r.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Rule List */}
      <div className={`flex-1 flex flex-col border-r border-siem-border bg-siem-bg/30 ${editingRule ? 'hidden lg:flex' : ''}`}>
        <div className="p-6 border-b border-siem-border bg-siem-panel">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl border border-blue-200">
                <FileCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-siem-text tracking-tight">Detection Rules</h1>
                <p className="text-sm text-siem-muted font-medium mt-0.5">Manage AeriSeg YAML rules and ASQL logic</p>
              </div>
            </div>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100"
              onClick={() => {
                setEditingRule({ _filename: 'new_rule.yaml', id: 'NEW_RULE', title: 'New Rule', severity: 'MEDIUM' });
                setEditedContent('id: NEW-RULE\ntitle: New Detection Rule\ndescription: Describe rule\nseverity: MEDIUM\nenabled: true\nasql_query: source:web "pattern"');
              }}
            >
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-siem-muted" />
            <input 
              type="text" 
              placeholder="Search rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-siem-bg border border-siem-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-siem-panel rounded-2xl border border-siem-border"></div>)}
            </div>
          ) : filteredRules.map(rule => (
            <div 
              key={rule._filename}
              onClick={() => handleEdit(rule)}
              className={`p-5 bg-siem-panel border rounded-2xl cursor-pointer transition-all hover:shadow-md hover:border-blue-200 group relative ${editingRule?._filename === rule._filename ? 'border-blue-500 shadow-lg ring-1 ring-blue-500' : 'border-siem-border shadow-sm'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-siem-muted uppercase tracking-widest">{rule.id}</div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${rule.source === 'database' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                      {rule.source || 'yaml'}
                    </span>
                  </div>
                  <h3 className="font-bold text-siem-text group-hover:text-blue-600 transition-colors">{rule.title}</h3>
                </div>
                <StatusBadge status={rule.severity} />
              </div>
              <p className="text-xs text-siem-muted line-clamp-2 leading-relaxed mb-4">{rule.description}</p>
              
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-siem-muted">
                <div className="flex items-center gap-4">
                  <span>Window: {rule.time_window_seconds}s</span>
                  <span>Threshold: {rule.threshold}</span>
                </div>
                {user?.role === 'ADMIN' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(rule._filename); }}
                    className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Panel */}
      {editingRule && (
        <div className="w-full lg:w-1/2 flex flex-col bg-siem-panel animate-in slide-in-from-right duration-300 shadow-2xl relative z-10">
          <div className="p-4 border-b border-siem-border flex items-center justify-between bg-siem-bg/50">
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs font-black text-siem-text uppercase truncate max-w-[200px]">{editingRule.title}</div>
                <div className="text-[9px] text-siem-muted font-bold uppercase tracking-widest">{editingRule._filename}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
              <button 
                onClick={() => setEditingRule(null)}
                className="p-2 hover:bg-slate-200 rounded-lg text-siem-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col p-6 bg-slate-900">
            <div className="flex items-center gap-2 mb-4 text-blue-400/50">
               <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
               <span className="text-[10px] font-bold uppercase tracking-widest">YAML Editor</span>
            </div>
            <textarea 
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-transparent text-blue-50 font-mono text-sm resize-none focus:outline-none custom-scrollbar leading-relaxed"
              placeholder="id: RULE-ID..."
            />
          </div>

          <div className="p-4 bg-siem-panel border-t border-siem-border">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
               <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                 Updating this rule will immediately affect the background detection scheduler. 
                 Ensure ASQL syntax and YAML structure are valid.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
