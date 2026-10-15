import React, { useState } from 'react';
import axios from 'axios';
import { 
  Box, Shield, Cpu, Zap, Radio, Globe, 
  Terminal, CheckCircle2, AlertCircle, RefreshCw, 
  ExternalLink, Settings2, Sliders, Bell, Sparkles,
  Search, Filter, Lock, Key, ArrowRight, X,
  Database, Eye, Layers, Workflow, Server, Cloud
} from 'lucide-react';

const INTEGRATIONS_CATALOG = [
  {
    id: 'google-gemini',
    name: 'Gemini on Vertex AI',
    category: 'Google Cloud Ecosystem',
    description: 'Multi-turn reasoning and operational assistance: root-cause analysis, plant-floor operator briefings, and safety-aware SOP recommendations.',
    status: 'CONNECTED',
    statusText: 'Gemini 1.5/2.0 Flash Active',
    badge: 'Reasoning Engine',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
    stats: { requests: '6,412 queries', latency: '380ms avg', role: 'Reasoning' },
    configFields: [
      { key: 'model', label: 'Vertex AI Model', value: 'gemini-1.5-flash', type: 'text', disabled: true },
      { key: 'temperature', label: 'Generation Temperature', value: '0.2 (Deterministic SOC)', type: 'text', disabled: true },
      { key: 'region', label: 'GCP Region', value: 'us-central1', type: 'text', disabled: true }
    ]
  },
  {
    id: 'google-vertex-pdm',
    name: 'Vertex AI Machine Learning',
    category: 'Google Cloud Ecosystem',
    description: 'Predictive and machine learning workloads: time-series sensor anomaly detection, remaining useful life (RUL), and MTBF failure forecasting.',
    status: 'ACTIVE',
    statusText: 'AutoML Time-Series Model',
    badge: 'Predictive ML',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: <Cpu className="w-6 h-6 text-cyan-400" />,
    stats: { accuracy: '98.4%', mtbf_gain: '+32%', inference: '24ms' },
    configFields: [
      { key: 'endpoint', label: 'Vertex AI Endpoint', value: 'projects/aeriseg/locations/us-central1/endpoints/pdm-v1', type: 'text' },
      { key: 'target_metric', label: 'Target Objective', value: 'MTBF / RUL Remaining Useful Life', type: 'text', disabled: true }
    ]
  },
  {
    id: 'google-bigquery',
    name: 'Google BigQuery Telemetry Engine',
    category: 'Google Cloud Ecosystem',
    description: 'High-scale sensor and operational data analysis: petabyte-scale historical OT telemetry, fleet OEE trend metrics, and BigQuery ML SQL queries.',
    status: 'CONNECTED',
    statusText: 'Dataset: aeriseg_factory_telemetry',
    badge: 'Data Warehouse',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <Database className="w-6 h-6 text-blue-400" />,
    stats: { events: '1.4B events', query_p95: '1.2s', oee_tracked: '94.2%' },
    configFields: [
      { key: 'dataset', label: 'BigQuery Dataset', value: 'aeriseg_factory_telemetry', type: 'text' },
      { key: 'partitioning', label: 'Partition Strategy', value: 'DAY (event_timestamp)', type: 'text', disabled: true }
    ]
  },
  {
    id: 'google-cloud-storage',
    name: 'Google Cloud Storage (GCS)',
    category: 'Google Cloud Ecosystem',
    description: 'Durable object storage for thermal and defect inspection imagery, raw PCAP sensor captures, and immutable forensic case files.',
    status: 'ACTIVE',
    statusText: 'Bucket: gs://aeriseg-industrial-evidence',
    badge: 'Evidence Locker',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <Layers className="w-6 h-6 text-emerald-400" />,
    stats: { stored: '4.8 TB', pcap_files: '12,400', retention: '365 days' },
    configFields: [
      { key: 'bucket', label: 'Storage Bucket', value: 'gs://aeriseg-industrial-evidence', type: 'text' },
      { key: 'storage_class', label: 'Storage Class', value: 'Standard (Multi-Region)', type: 'text', disabled: true }
    ]
  },
  {
    id: 'google-vision-ai',
    name: 'Google Vision AI & Vertex Vision',
    category: 'Google Cloud Ecosystem',
    description: 'Thermal camera anomaly detection (overheating bearings and motor coils) and automated assembly line product defect detection.',
    status: 'ACTIVE',
    statusText: 'Stream: Thermal Line-1 + QA-Cam',
    badge: 'Vision AI',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Eye className="w-6 h-6 text-amber-400" />,
    stats: { fps: '30 FPS', defect_recall: '99.1%', thermal_alerts: '0 active' },
    configFields: [
      { key: 'vision_model', label: 'Vision Model', value: 'Vertex AI Custom Vision: thermal_bearing_v2', type: 'text', disabled: true },
      { key: 'threshold', label: 'Overheat Delta Alert', value: '85.0 °C', type: 'text' }
    ]
  },
  {
    id: 'google-pubsub',
    name: 'Google Cloud Pub/Sub',
    category: 'Google Cloud Ecosystem',
    description: 'Globally scalable event ingestion bus streaming high-frequency PLC registers (Modbus/S7comm), host telemetry, and security alarms.',
    status: 'CONNECTED',
    statusText: 'Topic: factory-telemetry-stream',
    badge: 'Event Streaming',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    icon: <Radio className="w-6 h-6 text-yellow-400" />,
    stats: { throughput: '45k msgs/s', latency: '<15ms', ack_rate: '99.99%' },
    configFields: [
      { key: 'topic', label: 'Pub/Sub Topic', value: 'projects/aeriseg/topics/factory-telemetry-stream', type: 'text' },
      { key: 'ordering', label: 'Message Ordering Key', value: 'asset_id', type: 'text', disabled: true }
    ]
  },
  {
    id: 'google-dataflow',
    name: 'Google Cloud Dataflow (Apache Beam)',
    category: 'Google Cloud Ecosystem',
    description: 'Serverless stream and batch data pipeline: real-time windowed deduplication, ECS normalization, asset enrichment, and dual-sink routing.',
    status: 'ACTIVE',
    statusText: 'Job: aeriseg-stream-normalizer',
    badge: 'Data Pipeline',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: <Workflow className="w-6 h-6 text-purple-400" />,
    stats: { workers: '4 auto-scaled', lag: '<120ms', window: '300s sliding' },
    configFields: [
      { key: 'job_name', label: 'Dataflow Job Name', value: 'aeriseg-stream-normalizer', type: 'text' },
      { key: 'max_workers', label: 'Max Auto-Scaled Workers', value: '8', type: 'number' }
    ]
  },
  {
    id: 'google-cloud-run',
    name: 'Google Cloud Run Application Services',
    category: 'Google Cloud Ecosystem',
    description: 'Serverless container platform hosting the AeriSeg FastAPI backend, WebSockets broker, and high-density React 18 Analyst Workbench.',
    status: 'CONNECTED',
    statusText: 'Service: aeriseg-industrial-core',
    badge: 'Core Hosting',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    icon: <Server className="w-6 h-6 text-sky-400" />,
    stats: { instances: '2 active (0-10)', cpu_p99: '18%', memory: '1Gi' },
    configFields: [
      { key: 'service_url', label: 'Cloud Run Service URL', value: 'https://aeriseg-industrial-core-uc.a.run.app', type: 'text' },
      { key: 'concurrency', label: 'Container Concurrency', value: '80', type: 'number' }
    ]
  },
  {
    id: 'industrial-modbus',
    name: 'Modbus TCP / ICS Collector',
    category: 'Industrial OT/ICS',
    description: 'Inspects register-level coils and holding registers across water treatment, turbine, and centrifuge PLCs.',
    status: 'ACTIVE',
    statusText: 'Streaming Register Telemetry',
    badge: 'Critical OT',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Cpu className="w-6 h-6 text-amber-400" />,
    stats: { throughput: '124 regs/sec', anomalies: '2 suppressed', health: '100%' },
    configFields: [
      { key: 'port', label: 'Modbus Port', value: '502', type: 'text' },
      { key: 'target_subnet', label: 'Target PLC Subnet', value: '192.168.1.0/24', type: 'text' },
      { key: 'polling_rate', label: 'Poll Interval (ms)', value: '1000', type: 'number' }
    ]
  },
  {
    id: 'industrial-s7',
    name: 'Siemens S7comm Inspector',
    category: 'Industrial OT/ICS',
    description: 'Decodes proprietary Siemens S7-300 / S7-1200 / S7-1500 PLC communications, memory byte writes, and firmware flash commands.',
    status: 'ACTIVE',
    statusText: 'Monitoring Rack 0 / Slot 2',
    badge: 'OT Protocol',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <Radio className="w-6 h-6 text-amber-500" />,
    stats: { throughput: '86 cmds/sec', safety_interlocks: 'Nominal', health: '100%' },
    configFields: [
      { key: 'rack_slot', label: 'Rack / Slot', value: '0 / 2', type: 'text' },
      { key: 'plc_ip', label: 'PLC Controller IP', value: '192.168.1.10', type: 'text' }
    ]
  },
  {
    id: 'aeriseg-agent',
    name: 'AeriSeg Host Telemetry Daemon',
    category: 'Endpoint & EDR',
    description: 'Native host collector streaming genuine process executions, CPU/RAM utilization, network sockets, and security logs.',
    status: 'CONNECTED',
    statusText: 'Fleet Ingestion Active',
    badge: 'EDR Agent',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <Terminal className="w-6 h-6 text-blue-400" />,
    stats: { active_hosts: 'DESKTOP-AOFGK7K', eps: '1.2 EPS', agent_ver: 'v1.0.0' },
    configFields: [
      { key: 'heartbeat_interval', label: 'Heartbeat Interval (s)', value: '5', type: 'number' },
      { key: 'enrollment_key', label: 'Cluster PSK Key', value: '7f3a8c9d4e', type: 'text', disabled: true }
    ]
  },
  {
    id: 'suricata-ids',
    name: 'Suricata EVE-JSON IDS Engine',
    category: 'Network & Perimeter',
    description: 'Deep packet inspection for signature-based network intrusion detection, anomalous flow payloads, and DNS tunneling.',
    status: 'CONNECTED',
    statusText: 'EVE Log Pipeline Ready',
    badge: 'Network IDS',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <Shield className="w-6 h-6 text-emerald-400" />,
    stats: { parsed_events: '14,290 alerts', drop_rate: '0.00%', health: '100%' },
    configFields: [
      { key: 'eve_path', label: 'EVE JSON Path', value: '/var/log/suricata/eve.json', type: 'text' },
      { key: 'interface', label: 'Capture Interface', value: 'eth0 (Promiscuous)', type: 'text' }
    ]
  },
  {
    id: 'slack-notifications',
    name: 'Slack Security Webhook',
    category: 'Alerting & SOAR',
    description: 'Dispatches real-time high & critical security alerts and automated SOAR execution notifications to designated Slack channels.',
    status: 'STANDBY',
    statusText: 'Channel #secops-alerts',
    badge: 'Notification',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: <Bell className="w-6 h-6 text-purple-400" />,
    stats: { dispatches_today: '18 alerts', delivery_rate: '100%', avg_time: '120ms' },
    configFields: [
      { key: 'webhook_url', label: 'Incoming Webhook URL', value: 'https://hooks.slack.com/services/T00/B00/X00', type: 'password' },
      { key: 'channel', label: 'Alert Channel', value: '#secops-alerts', type: 'text' },
      { key: 'min_severity', label: 'Min Severity Trigger', value: 'HIGH', type: 'text' }
    ]
  },
  {
    id: 'alienvault-otx',
    name: 'AlienVault OTX & Threat Intel Feeds',
    category: 'Threat Intelligence',
    description: 'Synchronizes adversary IOC indicators, malicious IP reputation, C2 domains, and SHA256 hashes against active telemetry.',
    status: 'CONNECTED',
    statusText: '1.2M IOCs Ingested',
    badge: 'Threat Intel',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <Globe className="w-6 h-6 text-cyan-400" />,
    stats: { pulses: '4,102 Pulses', sync_interval: 'Hourly', last_sync: '12 min ago' },
    configFields: [
      { key: 'api_key', label: 'OTX API Key', value: '••••••••••••••••••••••••••••••', type: 'password' },
      { key: 'confidence_threshold', label: 'Min Confidence Score', value: '75%', type: 'text' }
    ]
  },
  {
    id: 'jira-service-desk',
    name: 'Jira Service Management SOAR',
    category: 'Alerting & SOAR',
    description: 'Automatically creates formal IT/SecOps tickets for critical containment tasks and compliance audit trails.',
    status: 'STANDBY',
    statusText: 'Project SEC-OPS',
    badge: 'Ticketing',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: <Box className="w-6 h-6 text-blue-400" />,
    stats: { open_tickets: '4 cases', auto_assigned: 'Yes', sync_state: 'Healthy' },
    configFields: [
      { key: 'jira_url', label: 'Atlassian Domain', value: 'https://aeriseg.atlassian.net', type: 'text' },
      { key: 'project_key', label: 'Project Key', value: 'SEC', type: 'text' }
    ]
  }
];

export default function Integrations() {
  const [catalog, setCatalog] = useState(INTEGRATIONS_CATALOG);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeConfig, setActiveConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const categories = ['ALL', 'Google Cloud Ecosystem', 'Industrial OT/ICS', 'Endpoint & EDR', 'Network & Perimeter', 'Alerting & SOAR', 'Threat Intelligence'];

  const filtered = catalog.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTestConnection = (integration) => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult({
        success: true,
        message: `Successfully validated connection to ${integration.name}. Latency: 48ms. Handshake verified.`
      });
    }, 900);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-siem-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600/10 p-2.5 rounded-2xl border border-blue-500/30">
              <Box className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Security Integrations</h1>
          </div>
          <p className="text-siem-muted text-sm font-medium">
            Connect AI reasoning, industrial protocols, EDR telemetry, and SOAR response pipelines
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-siem-border rounded-xl flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs">
              <span className="text-white font-bold">{catalog.length} / {catalog.length} Active</span>
              <span className="text-siem-muted ml-1">Connectors</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-slate-900 border border-siem-border rounded-xl text-xs font-mono text-blue-400">
            API v1.4 REST + WS
          </div>
        </div>
      </div>

      {/* Controls: Search & Category Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-siem-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search integrations, protocols, APIs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-siem-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-siem-muted focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-slate-900 border border-siem-border text-siem-muted hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div 
            key={item.id}
            className="enterprise-card bg-slate-900/60 border border-siem-border hover:border-blue-500/40 rounded-2xl p-6 transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Ambient Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="p-3 bg-slate-950 border border-siem-border rounded-xl group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-siem-muted">
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === 'CONNECTED' || item.status === 'ACTIVE' 
                        ? 'bg-emerald-400 animate-pulse' 
                        : 'bg-amber-400'
                    }`} />
                    <span className="font-semibold text-[11px] text-white">{item.statusText}</span>
                  </div>
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {item.name}
              </h3>
              <p className="text-xs text-siem-muted leading-relaxed line-clamp-3 mb-6">
                {item.description}
              </p>
            </div>

            {/* Bottom Metrics & Actions */}
            <div>
              {/* Mini Stats Bar */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-siem-border/60 grid grid-cols-3 gap-2 mb-4 text-center">
                {Object.entries(item.stats).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-siem-muted truncate">{k.replace('_', ' ')}</div>
                    <div className="text-[11px] font-bold text-slate-200 mt-0.5 truncate">{v}</div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveConfig(item); setTestResult(null); }}
                  className="flex-1 py-2 px-3 bg-slate-950 hover:bg-blue-600/10 border border-siem-border hover:border-blue-500/50 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                  Configure
                </button>
                <button
                  onClick={() => handleTestConnection(item)}
                  title="Verify connector handshake"
                  className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-siem-border rounded-xl text-xs font-semibold text-siem-muted hover:text-white transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Drawer / Modal */}
      {activeConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-siem-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-siem-border mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 border border-siem-border rounded-xl">
                  {activeConfig.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeConfig.name}</h3>
                  <div className="text-xs text-siem-muted">{activeConfig.category} Integration Settings</div>
                </div>
              </div>
              <button 
                onClick={() => setActiveConfig(null)}
                className="p-1.5 hover:bg-slate-800 text-siem-muted hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config Fields */}
            <div className="space-y-4 mb-6">
              {activeConfig.configFields.map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-siem-muted block mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    defaultValue={f.value}
                    disabled={f.disabled}
                    className="w-full bg-slate-900 border border-siem-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed font-mono text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div className={`p-3 rounded-xl mb-6 text-xs flex items-start gap-2.5 border ${
                testResult.success 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-950/30 border-red-500/30 text-red-400'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div>{testResult.message}</div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-siem-border">
              <button
                onClick={() => handleTestConnection(activeConfig)}
                disabled={testing}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-siem-border text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Verifying...' : 'Test Connection'}
              </button>
              <button
                onClick={() => {
                  setActiveConfig(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                Save & Apply
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
