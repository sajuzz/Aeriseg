import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Shield, Activity, Plus, CheckCircle2, RefreshCw, 
  Clock, Server, Cpu, Network, Monitor, Zap
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Network':    <Network className="w-5 h-5 text-blue-500" />,
  'Endpoint':   <Monitor className="w-5 h-5 text-indigo-500" />,
  'Healthcare': <Activity className="w-5 h-5 text-emerald-500" />,
  'OT/ICS':     <Cpu className="w-5 h-5 text-amber-500" />,
  'IoT':        <Zap className="w-5 h-5 text-purple-500" />,
};

export default function DataSources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await axios.get('/api/v1/ingest/sources');
        setSources(res.data.data);
      } catch (err) {
        console.error("Failed to fetch sources", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-siem-text tracking-tight">Telemetry Sources</h1>
            <p className="text-sm text-siem-muted font-medium mt-0.5">Manage ingestion connectors and normalized parsers</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-siem-panel border border-siem-border text-siem-text rounded-xl text-sm font-bold hover:bg-siem-bg flex items-center gap-2 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Request Connector
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-siem-panel border border-siem-border rounded-3xl animate-pulse" />
          ))
        ) : (
          sources.map(source => (
            <div 
              key={source.id} 
              className={`bg-siem-panel border p-6 rounded-3xl shadow-sm transition-all hover:shadow-md relative overflow-hidden group
                ${source.status === 'active' ? 'border-siem-border' : 'border-siem-border opacity-80'}`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {source.status === 'active' ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-siem-bg text-siem-muted rounded-full border border-siem-border">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Planned</span>
                  </div>
                )}
              </div>

              {/* Icon & Name */}
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-siem-bg rounded-2xl w-fit group-hover:bg-siem-panel transition-colors border border-transparent group-hover:border-siem-border">
                  {CATEGORY_ICONS[source.category] || <Server className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-siem-text uppercase tracking-tight">{source.name}</h3>
                  <div className="text-[10px] font-bold text-siem-muted uppercase tracking-widest mt-0.5">{source.category} Provider</div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-xs text-siem-muted leading-relaxed">
                  {source.status === 'active' 
                    ? `Live ${source.category} telemetry being ingested and normalized into AeriSeg Common Schema.`
                    : `Parser logic for ${source.name} is in development. Modular architecture is ready for mapping.`
                  }
                </p>
              </div>

              {/* Action */}
              <div className="mt-6">
                <button 
                  disabled={source.status !== 'active'}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all
                    ${source.status === 'active'
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                      : 'bg-siem-bg text-slate-300 cursor-not-allowed'}`}
                >
                  {source.status === 'active' ? 'View Live Stream' : 'Notify on Release'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <CsvImport />

      {/* Architecture Note */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield className="w-48 h-48" />
        </div>
        <div className="max-w-2xl relative">
          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Normalization Principle</h4>
          <h2 className="text-2xl font-black tracking-tight mb-4 leading-tight">
            Independent of Source. Unified in Defense.
          </h2>
          <p className="text-siem-muted text-sm leading-relaxed mb-6">
            AeriSeg utilizes a <strong>Modular Parser Registry</strong>. Every data source, whether it's an 
            MRI machine (HL7), a Power Grid PLC (Modbus), or a Windows Workstation (Sysmon), is normalized 
            into our <strong>Common Event Schema</strong> before detection.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-siem-panel/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
              Schema-Driven
            </div>
            <div className="px-4 py-2 bg-siem-panel/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
              Vendor-Agnostic
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


function CsvImport() {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('Windows Event');
  const [replaySpeed, setReplaySpeed] = useState('10x');
  const [status, setStatus] = useState('idle'); // idle, uploading, running, done, error
  const [jobId, setJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', sourceType);
    formData.append('replay_speed', replaySpeed);

    try {
      const res = await axios.post('/api/ingest/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setJobId(res.data.job_id);
      setStatus('running');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.response?.data?.detail || 'An error occurred during upload.');
    }
  };

  useEffect(() => {
    let interval;
    if (status === 'running' && jobId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/ingest/jobs/${jobId}`);
          setJobProgress(res.data);
          if (res.data.status === 'Completed' || res.data.status === 'Error') {
            setStatus('done');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Job poll failed", err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, jobId]);

  return (
    <div className="mt-12 bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--border)]">
          <Database className="w-5 h-5 text-[rgb(var(--primary))]" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Historical Import</h2>
          <p className="text-xs font-medium text-[var(--text-muted)]">Bulk ingest logs with asynchronous replay</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Source Type</label>
            <div className="flex flex-wrap gap-2">
              {['Windows Event', 'Linux Audit', 'Firewall', 'Proxy', 'Custom'].map(t => (
                <button
                  key={t}
                  onClick={() => setSourceType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    sourceType === t 
                      ? 'bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))]' 
                      : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Choose CSV</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-[var(--text-muted)]
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-xl file:border-0
                  file:text-xs file:font-bold file:uppercase file:tracking-widest
                  file:bg-[var(--background)] file:text-[var(--text)] file:border file:border-[var(--border)]
                  hover:file:bg-[var(--surface-hover)] hover:file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Replay</label>
              <select 
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(e.target.value)}
                className="bg-[var(--background)] text-sm border border-[var(--border)] rounded-xl py-2.5 px-4 font-bold text-[var(--text)] focus:outline-none focus:border-[rgb(var(--primary))]"
              >
                <option value="Instant">Instant</option>
                <option value="1x">1x</option>
                <option value="5x">5x</option>
                <option value="10x">10x</option>
                <option value="25x">25x</option>
                <option value="100x">100x</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleUpload}
            disabled={!file || status === 'uploading' || status === 'running'}
            className="w-full py-3 bg-[rgb(var(--primary))] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[rgb(var(--primary),0.9)] transition-colors disabled:opacity-50"
          >
            {status === 'uploading' ? 'Queueing Job...' : status === 'running' ? 'Replaying Events...' : 'Start Ingestion'}
          </button>
          
          {status === 'error' && (
            <div className="text-red-500 text-sm font-medium p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="bg-[var(--background)] rounded-2xl border border-[var(--border)] p-6 flex flex-col justify-center min-h-[200px]">
          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60">
              <Database className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Awaiting upload...</p>
            </div>
          )}
          {status === 'uploading' && (
            <div className="flex flex-col items-center justify-center text-[var(--text-muted)] animate-pulse">
              <RefreshCw className="w-12 h-12 mb-3 animate-spin text-[rgb(var(--primary))]" />
              <p className="text-sm font-medium">Initializing Replay Worker...</p>
            </div>
          )}
          {(status === 'running' || status === 'done') && jobProgress && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {status === 'running' ? (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  <span className="font-bold text-[var(--text)]">Replay Job {status === 'running' ? 'Running' : 'Completed'}</span>
                </div>
                <div className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-[10px] font-mono text-[var(--text-muted)]">
                  {jobProgress.job_id.substring(0,8)}
                </div>
              </div>
              
              <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="h-2 bg-[rgb(var(--primary))] transition-all duration-500" style={{ width: `${Math.max(1, (jobProgress.processed / jobProgress.total_events) * 100)}%` }} />
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Events</div>
                  <div className="text-xl font-bold text-[var(--text)]">
                    {jobProgress.processed.toLocaleString()} <span className="text-sm text-[var(--text-muted)]">/ {jobProgress.total_events.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Replay Speed</div>
                  <div className="text-xl font-bold text-amber-500">{jobProgress.speed}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">EPS</div>
                  <div className="text-xl font-bold text-blue-500">
                    {jobProgress.elapsed_sec > 0 ? Math.round(jobProgress.processed / jobProgress.elapsed_sec).toLocaleString() : 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{status === 'running' ? 'ETA' : 'Elapsed'}</div>
                  <div className="text-xl font-bold text-[var(--text)]">
                    {status === 'running' && jobProgress.processed > 0 ? (
                      `${Math.round((jobProgress.total_events - jobProgress.processed) / (jobProgress.processed / jobProgress.elapsed_sec))} sec`
                    ) : (
                      `${jobProgress.elapsed_sec} sec`
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
