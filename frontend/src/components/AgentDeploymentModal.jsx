import React, { useState } from 'react';
import axios from 'axios';
import { X, Copy, Check, Terminal, Server, Monitor, Loader2 } from 'lucide-react';

export default function AgentDeploymentModal({ isOpen, onClose, onDeployed }) {
  const [platform, setPlatform] = useState('linux');
  const [copied, setCopied] = useState(false);
  const [managerIp, setManagerIp] = useState('192.168.1.20');
  const [port, setPort] = useState('8000');
  const [agentName, setAgentName] = useState('ubuntu-web');
  const [enrollmentKey, setEnrollmentKey] = useState('7f3a8c9d4e');
  const [deploying, setDeploying] = useState(false);

  if (!isOpen) return null;

  const getCommand = () => {
    if (platform === 'linux' || platform === 'macos') {
      return `curl -sSL http://${managerIp}:${port}/install.sh | sudo bash -s -- \\\n  --manager ${managerIp} \\\n  --key ${enrollmentKey}`;
    } else {
      return `Invoke-WebRequest -Uri http://${managerIp}:${port}/install.ps1 -OutFile install.ps1\n.\\install.ps1 -Manager ${managerIp} -Key ${enrollmentKey}`;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setDeploying(true);
    try {
      // Simulate waiting for agent to heartbeat
      await new Promise(r => setTimeout(r, 2000));
      await axios.post('/api/agents/deploy', {
        hostname: agentName,
        ip_address: managerIp,
        os_type: platform
      });
      if (onDeployed) onDeployed();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[var(--surface)] border border-[var(--border)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--background)] border border-[var(--border)] p-2 rounded-xl">
              <Terminal className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text)] text-lg tracking-tight">Deploy New Agent</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Install AeriSeg Endpoint</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {/* OS Selector */}
          <div className="mb-6">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Operating System</label>
            <div className="flex gap-4">
              <PlatformButton active={platform === 'linux'} onClick={() => setPlatform('linux')} icon={<Terminal className="w-4 h-4" />} label="Linux" />
              <PlatformButton active={platform === 'windows'} onClick={() => setPlatform('windows')} icon={<Monitor className="w-4 h-4" />} label="Windows" />
              <PlatformButton active={platform === 'macos'} onClick={() => setPlatform('macos')} icon={<Server className="w-4 h-4" />} label="macOS" />
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Manager IP</label>
              <input type="text" value={managerIp} onChange={e => setManagerIp(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[rgb(var(--primary))]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Port</label>
              <input type="text" value={port} onChange={e => setPort(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[rgb(var(--primary))]" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Enrollment Key</label>
              <div className="flex">
                <input type="text" readOnly value={enrollmentKey} className="w-full bg-[var(--background)] border border-[var(--border)] rounded-l-xl px-4 py-2 text-sm text-[var(--text)] font-mono opacity-80" />
                <button className="bg-[var(--surface-hover)] border border-l-0 border-[var(--border)] rounded-r-xl px-4 text-[var(--text)] text-xs font-bold hover:bg-[var(--border)] transition-colors">Rotate Key</button>
              </div>
            </div>
          </div>

          {/* Command Output */}
          <div className="space-y-4">
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--primary))] animate-pulse"></div>
               Installation Command
            </div>
            <div className="relative group">
              <pre className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 pr-16 font-mono text-xs text-[var(--text)] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {getCommand()}
              </pre>
              <button 
                onClick={copyToClipboard}
                className="absolute top-4 right-4 p-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-[var(--text)] transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--surface)] border-t border-[var(--border)] flex justify-between items-center">
          <p className="text-[10px] text-[var(--text-muted)] font-medium max-w-[60%]">
            After running the command, verify the connection. The agent should appear online within 30 seconds.
          </p>
          <button 
            onClick={handleVerify}
            disabled={deploying}
            className="px-6 py-2.5 bg-[rgb(var(--primary))] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[rgb(var(--primary),0.9)] transition-colors shadow-md disabled:opacity-50"
          >
            {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {deploying ? 'Waiting for Heartbeat...' : 'Verify Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlatformButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border 
      ${active 
        ? 'bg-[rgb(var(--primary),0.1)] text-[rgb(var(--primary))] border-[rgb(var(--primary))]' 
        : 'bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
    >
      {icon} {label}
    </button>
  );
}
