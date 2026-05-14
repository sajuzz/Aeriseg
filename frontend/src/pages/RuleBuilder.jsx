import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Code, Shield, Save, Play, Trash2, 
  Plus, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RuleBuilder() {
  const [rule, setRule] = useState({
    id: 'SIGMA_NEW_RULE',
    title: 'New Detection Rule',
    description: 'Detection of unusual activity',
    severity: 'MEDIUM',
    status: 'experimental',
    author: 'AeriSeg Analyst',
    mitre_tactic: 'Execution',
    mitre_technique: 'T1059',
    asql_query: 'source:suricata AND event_type:alert',
    threshold: { count: 3, seconds: 60 }
  });
  
  const [yamlPreview, setYamlPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Basic YAML-ish preview
    const yaml = `id: ${rule.id}
title: ${rule.title}
description: ${rule.description}
status: ${rule.status}
author: ${rule.author}
severity: ${rule.severity}
mitre_tactic: ${rule.mitre_tactic}
mitre_technique: ${rule.mitre_technique}

detection:
  asql_query: "${rule.asql_query}"
  threshold:
    count: ${rule.threshold.count}
    seconds: ${rule.threshold.seconds}

tags:
  - aeriseg
  - sigma_v1`;
    setYamlPreview(yaml);
  }, [rule]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/rules', rule);
      alert("Rule saved successfully to /backend/detections");
      navigate('/rules');
    } catch (err) {
      alert("Failed to save rule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-siem-border pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-500/30">
            <Code className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Sigma Rule Builder</h1>
            <p className="text-sm text-siem-muted font-medium">Authoring vendor-agnostic detection signatures</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
          >
            <Save className="w-4 h-4" /> {saving ? 'SAVING...' : 'SAVE RULE'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Editor Form */}
        <div className="space-y-6">
          <div className="enterprise-card p-6 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Meta Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rule ID" value={rule.id} onChange={v => setRule({...rule, id: v})} />
              <Field label="Severity" value={rule.severity} onChange={v => setRule({...rule, severity: v})} type="select" options={['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']} />
            </div>
            
            <Field label="Title" value={rule.title} onChange={v => setRule({...rule, title: v})} />
            <Field label="Description" value={rule.description} onChange={v => setRule({...rule, description: v})} />
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-siem-border">
              <Field label="MITRE Tactic" value={rule.mitre_tactic} onChange={v => setRule({...rule, mitre_tactic: v})} />
              <Field label="MITRE Technique" value={rule.mitre_technique} onChange={v => setRule({...rule, mitre_technique: v})} />
            </div>
          </div>

          <div className="enterprise-card p-6 space-y-4 border-l-4 border-l-blue-600">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-500" /> Detection Logic (ASQL)
            </h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest">Query Signature</label>
              <textarea 
                className="w-full h-24 bg-slate-900 border border-siem-border rounded-lg p-3 text-sm font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                value={rule.asql_query}
                onChange={e => setRule({...rule, asql_query: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Field label="Threshold Count" value={rule.threshold.count} onChange={v => setRule({...rule, threshold: {...rule.threshold, count: parseInt(v)}})} type="number" />
              <Field label="Window (Seconds)" value={rule.threshold.seconds} onChange={v => setRule({...rule, threshold: {...rule.threshold, seconds: parseInt(v)}})} type="number" />
            </div>
          </div>
        </div>

        {/* YAML Preview */}
        <div className="space-y-6 h-full">
          <div className="enterprise-card bg-slate-950 p-0 overflow-hidden h-full flex flex-col border-siem-border shadow-2xl">
            <div className="bg-slate-900 px-4 py-2 border-b border-siem-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-siem-muted uppercase tracking-widest">Live Sigma YAML Preview</span>
              </div>
              <span className="text-[9px] font-bold text-siem-border">v2.0-MVP</span>
            </div>
            <pre className="p-6 text-sm font-mono text-blue-300 leading-relaxed flex-1 overflow-y-auto">
              {yamlPreview}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", options = [] }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest">{label}</label>
      {type === "select" ? (
        <select 
          className="w-full bg-slate-900 border border-siem-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type}
          className="w-full bg-slate-900 border border-siem-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
