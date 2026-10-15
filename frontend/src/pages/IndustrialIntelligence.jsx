import { useState, useEffect } from 'react'
import { Cpu, ShieldAlert, Activity, CheckCircle2, AlertTriangle, Play, Server, Wrench, RefreshCw, Zap, Info, ShieldCheck, Check, X, FileText, Bot, Lock, Eye, TrendingDown, BarChart3, Layers, Factory, ChevronRight } from 'lucide-react'
import axios from 'axios'

// ── Rich mock data (no backend required) ─────────────────────────────────────
const MOCK_ASSETS = [
  { asset_id:'PLC-001', name:'Assembly Line A — Main Controller', purdue_level:'level_1', ip_address:'192.168.10.5', production_zone:'Zone A — Stamping', network_segment:'OT-L1-STAMP', criticality:'critical', owner_team:'Automation Eng.', health_score:58, firmware:'v2.1.4 (EOL)', last_maintenance:47, maintenance_window:{ is_active:false } },
  { asset_id:'PLC-002', name:'Welding Robot Controller', purdue_level:'level_1', ip_address:'192.168.10.8', production_zone:'Zone B — Welding', network_segment:'OT-L1-WELD', criticality:'critical', owner_team:'Robotics Team', health_score:74, firmware:'v3.0.1', last_maintenance:12, maintenance_window:{ is_active:true } },
  { asset_id:'RTU-003', name:'Packaging Line RTU', purdue_level:'level_1', ip_address:'192.168.10.15', production_zone:'Zone C — Packaging', network_segment:'OT-L1-PACK', criticality:'high', owner_team:'Automation Eng.', health_score:91, firmware:'v4.2.0', last_maintenance:8, maintenance_window:{ is_active:false } },
  { asset_id:'HMI-001', name:'SCADA HMI — Line Supervisor', purdue_level:'level_2', ip_address:'192.168.20.10', production_zone:'Control Room', network_segment:'OT-L2-CTRL', criticality:'critical', owner_team:'OT Security', health_score:67, firmware:'v5.1.2', last_maintenance:31, maintenance_window:{ is_active:false } },
  { asset_id:'HMI-002', name:'Welding Bay HMI', purdue_level:'level_2', ip_address:'192.168.20.14', production_zone:'Zone B — Welding', network_segment:'OT-L2-WELD', criticality:'high', owner_team:'Robotics Team', health_score:88, firmware:'v5.1.2', last_maintenance:15, maintenance_window:{ is_active:true } },
  { asset_id:'HIST-001', name:'OSIsoft PI Historian', purdue_level:'level_3', ip_address:'10.10.30.5', production_zone:'Engineering Network', network_segment:'OT-L3-ENG', criticality:'high', owner_team:'IT/OT Bridge', health_score:79, firmware:'PI Server 2023', last_maintenance:22, maintenance_window:{ is_active:false } },
  { asset_id:'EWS-001', name:'Engineering Workstation #1', purdue_level:'level_3', ip_address:'10.10.30.20', production_zone:'Engineering Network', network_segment:'OT-L3-ENG', criticality:'medium', owner_team:'OT Engineering', health_score:95, firmware:'Win11 22H2', last_maintenance:5, maintenance_window:{ is_active:false } },
  { asset_id:'FW-DMZ', name:'Purdue DMZ Firewall (L3↔L4)', purdue_level:'level_4', ip_address:'10.0.0.1', production_zone:'Enterprise IT DMZ', network_segment:'IT-DMZ', criticality:'critical', owner_team:'Network Security', health_score:99, firmware:'FortiOS 7.4', last_maintenance:3, maintenance_window:{ is_active:false } },
]

const MOCK_INCIDENTS = [
  {
    incident_id:'OT-INC-001', title:'IT→OT Lateral Movement: Eng. Workstation to PLC Subnet', cross_zone_pivot:true,
    correlation_rationale:'Engineering workstation (L3) established 14 direct TCP sessions to PLC-001 (L1) outside scheduled maintenance window. Pattern matches MITRE ICS T0886.',
    timeline:[
      { timestamp:'2026-10-15T04:12:33Z', rule_id:'OT-R001', source_ip:'10.10.30.20', dest_ip:'192.168.10.5', summary:'RDP session from EWS-001 to PLC subnet gateway — anomalous off-hours' },
      { timestamp:'2026-10-15T04:13:07Z', rule_id:'OT-R002', source_ip:'10.10.30.20', dest_ip:'192.168.10.5', summary:'Modbus TCP read of PLC-001 coil registers (14 polling requests in 30s)' },
      { timestamp:'2026-10-15T04:13:41Z', rule_id:'OT-R003', source_ip:'10.10.30.20', dest_ip:'192.168.10.5', summary:'Attempted write to register 4x0023 (motor speed setpoint) — BLOCKED by L1 firewall ACL' },
      { timestamp:'2026-10-15T04:14:19Z', rule_id:'OT-R004', source_ip:'10.10.30.20', dest_ip:'192.168.10.8', summary:'Lateral pivot to PLC-002 (Welding Robot) — new TCP SYN burst detected' },
    ],
    impact_assessment:{ priority_score:87, security_severity:'CRITICAL', potential_manufacturing_impact_score:74, is_maintenance_suppressed:false, scoring_formula_explanation:'Priority = 0.45×SecuritySev(95) + 0.35×MfgImpact(74) + 0.20×AssetCriticality(100) = 87.05' },
    ai_assessment:{ executive_summary:'An engineering workstation has established unauthorized communication paths to Level 1 PLC controllers, consistent with early-stage OT network reconnaissance. The attempted Modbus write to motor speed registers indicates adversary intent to manipulate physical processes. Immediate containment recommended before production shift start at 06:00.', operational_risk:'Assembly Line A and Welding Bay B are at direct risk. Estimated 12–18% throughput reduction on Line A if PLC-001 is compromised during production hours. Cascading effect possible to downstream Packaging Zone C.', ot_briefing:'PLC-001 coil register 4x0023 (motor speed setpoint) targeted. Safety relay polling on coil 0x0018 also observed — potential SIS bypass attempt. Recommend PLC-001 emergency segment isolation pending forensic review of ladder logic.' },
    recommendations:[
      { recommendation_id:'REC-001', title:'Isolate EWS-001 from OT Network Segment', description:'Block all traffic from 10.10.30.20 to 192.168.10.0/24 at L3↔L1 DMZ firewall immediately.', safety_rationale:'Non-disruptive — firewall rule change does not affect PLC operation.', is_disruptive:false, approval_status:'pending', simulated_execution_status:null },
      { recommendation_id:'REC-002', title:'Emergency PLC-001 Segment Isolation', description:'Remove PLC-001 from active network segment and place in maintenance VLAN. Requires plant floor coordination.', safety_rationale:'DISRUPTIVE — will halt Assembly Line A. Requires Plant Manager sign-off. Estimated downtime: 15–30 min.', is_disruptive:true, approval_status:'pending', simulated_execution_status:null },
      { recommendation_id:'REC-003', title:'Enable Enhanced IDS on OT-L1-STAMP Segment', description:'Deploy Suricata rules OT-2024-MODBUS-WRITE on the L1 stamping network segment.', safety_rationale:'Non-disruptive — passive monitoring only.', is_disruptive:false, approval_status:'pending', simulated_execution_status:null },
    ]
  },
  {
    incident_id:'OT-INC-002', title:'PLC-001 Firmware Integrity Alert — Unexpected Ladder Logic Modification', cross_zone_pivot:false,
    correlation_rationale:'PLC-001 firmware hash mismatch detected via baseline comparison. 3 new rungs added to ladder logic without change ticket. MITRE ICS T0857.',
    timeline:[
      { timestamp:'2026-10-15T02:44:11Z', rule_id:'OT-R010', source_ip:'192.168.10.5', dest_ip:'192.168.20.10', summary:'PLC-001 initiated unsolicited connection to HMI-001 — abnormal for L1→L2 direction' },
      { timestamp:'2026-10-15T02:45:03Z', rule_id:'OT-R011', source_ip:'Unknown', dest_ip:'192.168.10.5', summary:'Firmware write operation detected on PLC-001 — hash 0xA3F4 does not match baseline 0x2B91' },
      { timestamp:'2026-10-15T02:46:28Z', rule_id:'OT-R012', source_ip:'192.168.10.5', dest_ip:'192.168.10.8', summary:'PLC-001 broadcast to PLC-002 on non-standard port 502 — possible worm propagation' },
    ],
    impact_assessment:{ priority_score:92, security_severity:'CRITICAL', potential_manufacturing_impact_score:89, is_maintenance_suppressed:false, scoring_formula_explanation:'Priority = 0.45×SecuritySev(98) + 0.35×MfgImpact(89) + 0.20×AssetCriticality(100) = 92.05' },
    ai_assessment:{ executive_summary:'Unauthorized modification to PLC-001 ladder logic detected. This is a high-confidence indicator of TRITON/TRISIS-style attack targeting the Safety Instrumented System. Firmware hash mismatch is a definitive sign of compromise — not a false positive.', operational_risk:'If the modified ladder logic alters safety interlocks on Assembly Line A, physical damage to stamping equipment or personnel injury risk is elevated. OEE impact: 89% of Line A production at risk until PLC replaced with known-good firmware.', ot_briefing:'PLC-001 (Siemens S7-400) ladder logic has 3 unauthorized rungs. Rungs target: coil 0x0018 (safety relay inhibit), register 4x0029 (overpressure setpoint override), and timer T37 (coolant cycle delay). All three target physical safety mechanisms.' },
    recommendations:[
      { recommendation_id:'REC-004', title:'Immediate PLC-001 Power-Off and Forensic Capture', description:'Power cycle PLC-001 to halt modified logic execution. Capture volatile memory before shutdown.', safety_rationale:'DISRUPTIVE — halts Line A. REQUIRED for safety — modified firmware poses physical risk.', is_disruptive:true, approval_status:'pending', simulated_execution_status:null },
      { recommendation_id:'REC-005', title:'Flash PLC-001 with Golden Firmware Image', description:'Restore PLC-001 from authenticated firmware baseline v2.1.4-signed stored in secure vault.', safety_rationale:'Non-disruptive to other lines. Requires 45-min Line A downtime.', is_disruptive:false, approval_status:'pending', simulated_execution_status:null },
    ]
  },
]

// ── Sub-components ───────────────────────────────────────────────────────────

const PURDUE_META = {
  level_1:{ label:'L1 Field Control (PLCs/RTUs)', color:'bg-red-500', textColor:'text-red-400', border:'border-red-500/30', bg:'bg-red-500/10' },
  level_2:{ label:'L2 Supervisory (SCADA/HMI)', color:'bg-amber-500', textColor:'text-amber-400', border:'border-amber-500/30', bg:'bg-amber-500/10' },
  level_3:{ label:'L3 Operations (Historian/Eng.)', color:'bg-blue-500', textColor:'text-blue-400', border:'border-blue-500/30', bg:'bg-blue-500/10' },
  level_4:{ label:'L4 Enterprise IT / DMZ', color:'bg-gray-400', textColor:'text-gray-400', border:'border-gray-500/30', bg:'bg-gray-500/10' },
}

function PurdueBadge({ level }) {
  const m = PURDUE_META[level] || {}
  const labels = { level_1:'L1 Control', level_2:'L2 Supervisory', level_3:'L3 Operations', level_4:'L4 Enterprise' }
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.bg} ${m.textColor} border ${m.border}`}>{labels[level]||level}</span>
}

function CritBadge({ crit }) {
  const map = { critical:'bg-red-600/20 text-red-400 border-red-500/40', high:'bg-orange-600/20 text-orange-400 border-orange-500/40', medium:'bg-amber-600/20 text-amber-400 border-amber-500/40' }
  return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${map[crit?.toLowerCase()]||'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'}`}>{(crit||'LOW').toUpperCase()}</span>
}

function HealthBar({ score }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 65 ? 'bg-amber-500' : 'bg-red-500'
  const label = score >= 85 ? 'text-emerald-400' : score >= 65 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width:`${score}%` }}/>
      </div>
      <span className={`text-xs font-bold w-8 text-right ${label}`}>{score}</span>
    </div>
  )
}

// OT Risk Heatmap — Purdue Model grid
function OTHeatmap({ assets }) {
  const levels = ['level_1','level_2','level_3','level_4']
  return (
    <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-cyan-400"/>
        <h3 className="text-sm font-bold text-[var(--text)]">Purdue Model Risk Heatmap</h3>
        <span className="ml-auto text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Live OT Topology</span>
      </div>
      <div className="space-y-3">
        {levels.map(lvl => {
          const lvlAssets = assets.filter(a => a.purdue_level === lvl)
          const meta = PURDUE_META[lvl]
          const avgHealth = lvlAssets.length ? Math.round(lvlAssets.reduce((s,a)=>s+a.health_score,0)/lvlAssets.length) : 100
          const critical = lvlAssets.filter(a => a.health_score < 65).length
          return (
            <div key={lvl} className={`p-3 rounded-lg border ${meta.border} ${meta.bg} flex items-center gap-4`}>
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${meta.color} ${avgHealth<65?'animate-pulse':''}`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold ${meta.textColor}`}>{meta.label}</span>
                  <div className="flex items-center gap-2">
                    {critical > 0 && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 animate-pulse">
                        {critical} AT RISK
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)]">{lvlAssets.length} assets</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {lvlAssets.map(a => (
                    <div key={a.asset_id} title={`${a.name} — Health: ${a.health_score}`}
                      className={`flex-1 h-4 rounded cursor-default transition-all hover:scale-110 ${a.health_score>=85?'bg-emerald-500/60':a.health_score>=65?'bg-amber-500/60':'bg-red-500/70 animate-pulse'}`}
                      style={{maxWidth:'40px'}}
                    />
                  ))}
                  {lvlAssets.length === 0 && <span className="text-[10px] text-[var(--text-muted)]">No assets registered at this level</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-lg font-black ${avgHealth>=85?'text-emerald-400':avgHealth>=65?'text-amber-400':'text-red-400'}`}>{avgHealth}%</div>
                <div className="text-[10px] text-[var(--text-muted)]">Avg Health</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span>≥85 Healthy</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"/><span>65–84 Degraded</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/><span>&lt;65 Critical</span></div>
      </div>
    </div>
  )
}

// Predictive Maintenance Panel
function PredictiveMaintenance({ assets }) {
  const risky = [...assets].sort((a,b)=>a.health_score-b.health_score).slice(0,4)
  const mtbf = a => a.health_score >= 85 ? '90+ days' : a.health_score >= 70 ? `${Math.round(a.health_score*0.4)} days` : `${Math.round(a.health_score*0.2)} days`
  const cost = a => a.criticality==='critical' ? '$84,000/hr' : a.criticality==='high' ? '$31,000/hr' : '$8,000/hr'
  return (
    <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-4 h-4 text-amber-400"/>
        <h3 className="text-sm font-bold text-[var(--text)]">Predictive Maintenance Risk</h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">AI-Scored</span>
      </div>
      <div className="space-y-3">
        {risky.map(a => (
          <div key={a.asset_id} className="p-3 bg-[var(--surface-hover)] rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-[var(--text)] block">{a.name}</span>
                <span className="text-[10px] font-mono text-cyan-400">{a.asset_id}</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[var(--text-muted)]">Est. MTBF</div>
                <div className={`text-xs font-bold ${a.health_score<65?'text-red-400':a.health_score<80?'text-amber-400':'text-emerald-400'}`}>{mtbf(a)}</div>
              </div>
            </div>
            <HealthBar score={a.health_score}/>
            <div className="flex items-center justify-between mt-2 text-[10px]">
              <span className="text-[var(--text-muted)]">Last maint: <strong className={a.last_maintenance>30?'text-red-400':'text-[var(--text)]'}>{a.last_maintenance}d ago</strong></span>
              <span className="text-[var(--text-muted)]">Failure cost: <strong className="text-amber-400">{cost(a)}</strong></span>
            </div>
            {a.last_maintenance > 30 && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/5 border border-red-500/20 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0"/>
                Overdue maintenance — schedule immediately
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Production Impact Gauge
function ProductionImpact({ incidents, assets }) {
  const criticalAssets = assets.filter(a=>a.health_score<65&&a.criticality==='critical').length
  const totalCritical = assets.filter(a=>a.criticality==='critical').length
  const pct = totalCritical ? Math.round((criticalAssets/totalCritical)*100) : 0
  const oeeLoss = Math.round(pct * 0.9)
  const costPerHr = criticalAssets * 84000

  return (
    <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-4">
        <Factory className="w-4 h-4 text-red-400"/>
        <h3 className="text-sm font-bold text-[var(--text)]">Production Impact Assessment</h3>
      </div>
      <div className="flex items-center gap-6">
        {/* SVG donut gauge */}
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--surface-hover)" strokeWidth="12"/>
            <circle cx="50" cy="50" r="38" fill="none"
              stroke={pct>50?'#ef4444':pct>20?'#f97316':'#10b981'}
              strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${pct*2.39} 239`}
              style={{transition:'stroke-dasharray 1s ease'}}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black ${pct>50?'text-red-400':pct>20?'text-amber-400':'text-emerald-400'}`}>{pct}%</span>
            <span className="text-[9px] text-[var(--text-muted)]">AT RISK</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Critical assets at risk</span>
            <span className="font-bold text-red-400">{criticalAssets} / {totalCritical}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Estimated OEE loss</span>
            <span className="font-bold text-amber-400">{oeeLoss}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Financial exposure/hr</span>
            <span className="font-bold text-red-400">${costPerHr.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Active OT incidents</span>
            <span className="font-bold text-cyan-400">{incidents.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IndustrialIntelligence() {
  const [activeTab, setActiveTab] = useState('incidents')
  const [assets, setAssets] = useState(MOCK_ASSETS)
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS)
  const [selectedIncident, setSelectedIncident] = useState(MOCK_INCIDENTS[0])
  const [recs, setRecs] = useState(MOCK_INCIDENTS[0].recommendations)
  const [assetFilter, setAssetFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState(false)

  // Try live backend, fall back silently to mock
  useEffect(() => {
    axios.get('/api/industrial-intelligence/assets').then(r=>{ if(r.data?.length) setAssets(r.data) }).catch(()=>{})
    axios.get('/api/industrial-intelligence/incidents').then(r=>{ if(r.data?.length) setIncidents(r.data) }).catch(()=>{})
  }, [])

  const selectIncident = (inc) => {
    setSelectedIncident(inc)
    setRecs(inc.recommendations || [])
  }

  const handleApproval = (recId, decision) => {
    setActionLoading(true)
    setTimeout(() => {
      setRecs(prev => prev.map(r => r.recommendation_id === recId
        ? { ...r, approval_status: decision === 'APPROVED' ? 'executed' : 'rejected',
            simulated_execution_status: decision === 'APPROVED' ? '✓ Action executed in sandbox — firewall rule pushed to OT-DMZ-01' : null }
        : r))
      setActionLoading(false)
    }, 900)
  }

  const filteredAssets = assetFilter === 'ALL' ? assets : assets.filter(a => a.purdue_level === assetFilter || a.criticality === assetFilter)

  const tabs = [
    { id:'incidents', label:`Correlated Incidents (${incidents.length})`, icon:<Activity className="w-4 h-4"/> },
    { id:'heatmap', label:'OT Risk Heatmap', icon:<Layers className="w-4 h-4"/> },
    { id:'maintenance', label:'Predictive Maintenance', icon:<Wrench className="w-4 h-4"/> },
    { id:'assets', label:`Asset Registry (${assets.length})`, icon:<Server className="w-4 h-4"/> },
  ]

  return (
    <div className="flex flex-col gap-6 -m-6 p-6 min-h-[calc(100vh-64px)] bg-[var(--background)] text-[var(--text)]">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-7 h-7"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Industrial Security Intelligence</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Purdue Model / OT Grid</span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Explainable IT/OT correlation · Manufacturing impact scoring · Safety-aware response gates</p>
          </div>
        </div>
        <a href="/copilot" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/40 text-sm font-semibold text-violet-300 hover:border-violet-400 transition-all">
          <Bot className="w-4 h-4"/>Ask Manufacturing AI Copilot
          <ChevronRight className="w-3.5 h-3.5"/>
        </a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Tracked OT Assets', value:assets.length, sub:'L1–L4 Mapped', color:'text-cyan-400' },
          { label:'Correlated Incidents', value:incidents.length, sub:'Multi-stage', color:'text-amber-400' },
          { label:'Critical At Risk', value:assets.filter(a=>a.health_score<65&&a.criticality==='critical').length, sub:'PLCs & RTUs', color:'text-red-400' },
          { label:'Maintenance Overdue', value:assets.filter(a=>a.last_maintenance>30).length, sub:'>30 day threshold', color:'text-orange-400' },
        ].map((k,i)=>(
          <div key={i} className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">{k.label}</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
              <span className={`text-xs font-medium ${k.color} opacity-80`}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===t.id?'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30':'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: Incidents */}
      {activeTab==='incidents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">Active OT Incidents</span>
            {incidents.map(inc=>{
              const sel = selectedIncident?.incident_id === inc.incident_id
              return (
                <div key={inc.incident_id} onClick={()=>selectIncident(inc)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${sel?'bg-[var(--surface-hover)] border-cyan-500':'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{inc.incident_id}</span>
                    {inc.cross_zone_pivot && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Cross-Zone Pivot</span>}
                  </div>
                  <h3 className="font-semibold text-sm mt-1 line-clamp-2">{inc.title}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border)] text-center text-xs">
                    {[['Priority', inc.impact_assessment.priority_score,'text-cyan-400'],['Severity',inc.impact_assessment.security_severity,'text-amber-400'],['Mfg Impact',inc.impact_assessment.potential_manufacturing_impact_score,'text-red-400']].map(([l,v,c])=>(
                      <div key={l}><span className="block text-[10px] text-[var(--text-muted)] uppercase">{l}</span><span className={`font-bold text-sm ${c}`}>{v}</span></div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            {selectedIncident && <>
              {/* Header card */}
              <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-cyan-400">{selectedIncident.incident_id}</span>
                      {selectedIncident.cross_zone_pivot && <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Cross-Zone IT➔OT Lateral Movement</span>}
                    </div>
                    <h2 className="text-xl font-bold mt-1">{selectedIncident.title}</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{selectedIncident.correlation_rationale}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-[var(--text-muted)] uppercase font-semibold">Priority Score</div>
                    <div className="text-3xl font-black text-cyan-400">{selectedIncident.impact_assessment.priority_score}<span className="text-sm font-normal text-[var(--text-muted)]">/100</span></div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">{selectedIncident.impact_assessment.scoring_formula_explanation}</span>
                </div>
              </div>

              {/* Gemini AI Assessment */}
              {selectedIncident.ai_assessment && (
                <div className="bg-gradient-to-r from-violet-950/40 via-[var(--surface)] to-[var(--surface)] p-5 rounded-xl border border-violet-500/30">
                  <div className="flex items-center gap-2 text-violet-400 mb-3">
                    <Bot className="w-5 h-5"/>
                    <h3 className="font-bold text-sm tracking-wide uppercase">AI Operational Impact Synthesis</h3>
                    <span className="ml-auto text-[10px] bg-violet-500/10 border border-violet-500/30 text-violet-300 px-2 py-0.5 rounded">Google Gemini · Vertex AI</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase block">Executive Summary</span>
                      <p className="text-[var(--text)] mt-0.5">{selectedIncident.ai_assessment.executive_summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                        <span className="text-xs font-semibold text-amber-400 uppercase block">Plant Floor Risk</span>
                        <p className="text-xs text-[var(--text)] mt-1">{selectedIncident.ai_assessment.operational_risk}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                        <span className="text-xs font-semibold text-cyan-400 uppercase block">OT Engineer Briefing</span>
                        <p className="text-xs text-[var(--text)] mt-1">{selectedIncident.ai_assessment.ot_briefing}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Correlated Telemetry Chronology</h3>
                <div className="space-y-3">
                  {selectedIncident.timeline.map((item,idx)=>(
                    <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs">
                      <span className="font-mono text-cyan-400 whitespace-nowrap">{item.timestamp?.split('T')[1]?.split('.')[0]||item.timestamp}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-200">{item.rule_id}</span>
                          <span className="text-[var(--text-muted)] font-mono">({item.source_ip} ➔ {item.dest_ip})</span>
                        </div>
                        <p className="text-[var(--text-muted)] mt-0.5">{item.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Operational Response Recommendations</h3>
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold"><Lock className="w-3.5 h-3.5"/>Human Approval Enforced</span>
                </div>
                <div className="space-y-3">
                  {recs.map(rec=>(
                    <div key={rec.recommendation_id} className={`p-4 rounded-xl border transition-all ${rec.is_disruptive?'bg-red-950/10 border-red-500/30':'bg-[var(--surface-hover)] border-[var(--border)]'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{rec.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rec.is_disruptive?'bg-red-500/20 text-red-400 border-red-500/40':'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                              {rec.is_disruptive?'DISRUPTIVE ACTION':'NON-DISRUPTIVE'}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{rec.description}</p>
                          <span className="text-[11px] text-amber-400 block mt-1 italic">⚠ {rec.safety_rationale}</span>
                        </div>
                        <div className="flex-shrink-0">
                          {rec.approval_status==='pending' ? (
                            <div className="flex items-center gap-2">
                              <button onClick={()=>handleApproval(rec.recommendation_id,'APPROVED')} disabled={actionLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50">
                                <Check className="w-3.5 h-3.5"/>Authorize
                              </button>
                              <button onClick={()=>handleApproval(rec.recommendation_id,'REJECTED')} disabled={actionLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-400 text-xs font-semibold transition-all">
                                <X className="w-3.5 h-3.5"/>Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${rec.approval_status==='executed'?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':'bg-gray-700 text-gray-300'}`}>
                              {rec.approval_status}
                            </span>
                          )}
                        </div>
                      </div>
                      {rec.simulated_execution_status && (
                        <div className="mt-3 p-2 rounded bg-black/30 text-[11px] font-mono text-emerald-400 border border-emerald-500/20">
                          ✓ {rec.simulated_execution_status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* TAB: OT Risk Heatmap */}
      {activeTab==='heatmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OTHeatmap assets={assets}/>
          <ProductionImpact incidents={incidents} assets={assets}/>
        </div>
      )}

      {/* TAB: Predictive Maintenance */}
      {activeTab==='maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PredictiveMaintenance assets={assets}/>
          <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-blue-400"/>
              <h3 className="text-sm font-bold">Maintenance Schedule Overview</h3>
            </div>
            <div className="space-y-2">
              {assets.map(a=>(
                <div key={a.asset_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[var(--text)] block truncate">{a.name}</span>
                    <span className="font-mono text-cyan-400">{a.asset_id}</span>
                  </div>
                  <HealthBar score={a.health_score}/>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${a.last_maintenance>30?'text-red-400 border-red-500/30 bg-red-500/10':'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
                    {a.last_maintenance}d ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Asset Registry */}
      {activeTab==='assets' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">Factory Assets ({filteredAssets.length})</span>
            <select value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs">
              <option value="ALL">All Assets</option>
              <option value="level_1">Purdue L1 (PLCs)</option>
              <option value="level_2">Purdue L2 (SCADA/HMI)</option>
              <option value="level_3">Purdue L3 (Historian/Eng)</option>
              <option value="level_4">Purdue L4 (IT DMZ)</option>
              <option value="critical">Critical Only</option>
            </select>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>{['Asset','Purdue Level','IP','Zone','Health','Criticality','Firmware','Maintenance'].map(h=><th key={h} className="p-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAssets.map(a=>(
                  <tr key={a.asset_id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="p-3"><span className="font-mono font-bold text-cyan-400 block">{a.asset_id}</span><span className="font-semibold">{a.name}</span></td>
                    <td className="p-3"><PurdueBadge level={a.purdue_level}/></td>
                    <td className="p-3 font-mono text-[var(--text-muted)]">{a.ip_address}</td>
                    <td className="p-3"><span className="font-medium">{a.production_zone}</span><span className="text-[10px] text-[var(--text-muted)] block font-mono">{a.network_segment}</span></td>
                    <td className="p-3 w-28"><HealthBar score={a.health_score}/></td>
                    <td className="p-3"><CritBadge crit={a.criticality}/></td>
                    <td className="p-3 text-[var(--text-muted)]">{a.firmware}</td>
                    <td className="p-3">
                      {a.maintenance_window?.is_active
                        ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Active Window</span>
                        : <span className={`text-[10px] ${a.last_maintenance>30?'text-red-400 font-bold':'text-[var(--text-muted)]'}`}>{a.last_maintenance}d ago</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
