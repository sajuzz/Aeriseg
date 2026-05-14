import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Server, Box, Monitor } from 'lucide-react';

export default function AgentDeploymentModal({ isOpen, onClose }) {
  const [platform, setPlatform] = useState('linux');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const serverUrl = window.location.origin;
  
  const commands = {
    linux: `curl -sSL ${serverUrl}/scripts/install_agent.sh | sudo bash -s -- --token MS-AGENT-7721-XYZ`,
    windows: `powershell -ExecutionPolicy Bypass -Command "iwr -useb ${serverUrl}/scripts/install_agent.ps1 | iex" -Token "MS-AGENT-7721-XYZ"`,
    docker: `docker run -d --name medishield-agent \\
  -e MS_SERVER="${serverUrl}" \\
  -e MS_TOKEN="MS-AGENT-7721-XYZ" \\
  medishield/agent:latest`
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Deploy Security Agent</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enroll new endpoint into MediShield</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-8">
            <PlatformButton 
              active={platform === 'linux'} 
              onClick={() => setPlatform('linux')} 
              icon={<Terminal className="w-4 h-4" />} 
              label="Linux" 
            />
            <PlatformButton 
              active={platform === 'windows'} 
              onClick={() => setPlatform('windows')} 
              icon={<Monitor className="w-4 h-4" />} 
              label="Windows" 
            />
            <PlatformButton 
              active={platform === 'docker'} 
              onClick={() => setPlatform('docker')} 
              icon={<Box className="w-4 h-4" />} 
              label="Docker" 
            />
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               Installation Command
            </div>
            <div className="relative group">
              <div className="bg-slate-900 rounded-2xl p-6 pr-16 font-mono text-sm text-blue-100 leading-relaxed break-all">
                {commands[platform]}
              </div>
              <button 
                onClick={() => copyToClipboard(commands[platform])}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-md border border-white/10"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 mt-6">
              <div className="p-2 bg-blue-100 rounded-xl shrink-0 h-fit">
                 <Server className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-tight">Security Checkpoint</h4>
                <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                  This command includes a unique registration token. Ensure the endpoint has outbound HTTPS access 
                  to your SIEM server on port 8000.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase tracking-widest hover:text-slate-900 transition-colors"
          >
            Close Terminal
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
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
    >
      {icon} {label}
    </button>
  );
}
