import { useState, useEffect } from 'react'
import {
  Cpu, ShieldAlert, Activity, CheckCircle2, AlertTriangle, Play,
  Server, Wrench, RefreshCw, Layers, ArrowRight, Zap, Info, ShieldCheck,
  Check, X, FileText, Bot, Lock, Eye
} from 'lucide-react'
import axios from 'axios'

export default function IndustrialIntelligence() {
  const [activeTab, setActiveTab] = useState('incidents') // 'incidents' | 'assets' | 'scenarios'
  const [assets, setAssets] = useState([])
  const [incidents, setIncidents] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('scenario_c')
  const [scenarioResult, setScenarioResult] = useState(null)
  const [assetFilter, setAssetFilter] = useState('ALL')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resAssets, resIncidents, resScenarios] = await Promise.all([
        axios.get('/api/industrial-intelligence/assets'),
        axios.get('/api/industrial-intelligence/incidents'),
        axios.get('/api/industrial-intelligence/scenarios'),
      ])
      setAssets(resAssets.data || [])
      setIncidents(resIncidents.data || [])
      setScenarios(resScenarios.data || [])

      if (resIncidents.data?.length > 0 && !selectedIncident) {
        selectIncident(resIncidents.data[0].incident_id)
      }
    } catch (err) {
      console.error('Failed to fetch industrial intelligence data:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectIncident = async (incidentId) => {
    try {
      setActionLoading(true)
      const [resInc, resExpl, resRecs] = await Promise.all([
        axios.get(`/api/industrial-intelligence/incidents/${incidentId}`),
        axios.get(`/api/industrial-intelligence/incidents/${incidentId}/explanation`),
        axios.get(`/api/industrial-intelligence/incidents/${incidentId}/recommendations`),
      ])
      setSelectedIncident(resInc.data)
      setExplanation(resExpl.data)
      setRecommendations(resRecs.data || [])
    } catch (err) {
      console.error('Failed to load incident detail:', err)
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRunScenario = async (scId) => {
    try {
      setActionLoading(true)
      const res = await axios.post(`/api/industrial-intelligence/scenarios/${scId}/run`)
      setScenarioResult(res.data)
      // Refresh incidents
      const resIncidents = await axios.get('/api/industrial-intelligence/incidents')
      setIncidents(resIncidents.data || [])
      if (res.data.incident) {
        selectIncident(res.data.incident.incident_id)
        setActiveTab('incidents')
      }
    } catch (err) {
      console.error('Failed to run scenario:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovalDecision = async (recId, decision) => {
    try {
      setActionLoading(true)
      await axios.post(`/api/industrial-intelligence/recommendations/${recId}/decision`, {
        decision,
        reviewer: 'SOC_Manager_Live',
        reason: decision === 'APPROVED' ? 'Approved simulated containment from UI' : 'Rejected by operator',
      })
      if (selectedIncident) {
        const resRecs = await axios.get(`/api/industrial-intelligence/incidents/${selectedIncident.incident_id}/recommendations`)
        setRecommendations(resRecs.data || [])
      }
    } catch (err) {
      console.error('Failed to record approval decision:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const getPurdueBadge = (level) => {
    switch (level) {
      case 'level_1':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">L1 Control (PLC)</span>
      case 'level_2':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">L2 Supervisory</span>
      case 'level_3':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">L3 Operations/Eng</span>
      case 'level_4':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">L4 Enterprise IT</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{level}</span>
    }
  }

  const getCriticalityBadge = (crit) => {
    switch (crit?.toLowerCase()) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/40">CRITICAL</span>
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-600/20 text-orange-400 border border-orange-500/40">HIGH</span>
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-600/20 text-amber-400 border border-amber-500/40">MEDIUM</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">LOW</span>
    }
  }

  const filteredAssets = assetFilter === 'ALL'
    ? assets
    : assets.filter(a => a.purdue_level === assetFilter || a.criticality === assetFilter.toLowerCase())

  return (
    <div className="flex flex-col gap-6 -m-6 p-6 min-h-[calc(100vh-64px)] bg-[var(--background)] text-[var(--text)]">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Industrial Security Intelligence</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Purdue Model / OT Grid
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Explainable IT/OT correlation, deterministic manufacturing impact scoring, and safety-aware response gates.
            </p>
          </div>
        </div>

        {/* Quick Scenario Runner Bar */}
        <div className="flex items-center gap-3 bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => handleRunScenario(selectedScenario)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Scenario</span>
          </button>
        </div>
      </div>

      {/* ── Metric Snapshot Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Tracked Industrial Assets</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold">{assets.length}</span>
            <span className="text-xs text-cyan-400 font-medium">L1-L4 Mapped</span>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Correlated Incidents</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-400">{incidents.length}</span>
            <span className="text-xs text-amber-400/80 font-medium">Multi-stage</span>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Critical Plant Controllers</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-red-400">{assets.filter(a => a.purdue_level === 'level_1').length}</span>
            <span className="text-xs text-red-400/80 font-medium">PLCs & RTUs</span>
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Maintenance Windows</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-400">{assets.filter(a => a.maintenance_window?.is_active).length}</span>
            <span className="text-xs text-emerald-400/80 font-medium">Suppression Active</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'incidents'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Correlated Incidents ({incidents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'assets'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Manufacturing Asset Registry ({assets.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'scenarios'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Scenario Demonstrator Lab</span>
        </button>
      </div>

      {/* ── TAB 1: Correlated Incidents & Triage ───────────────────── */}
      {activeTab === 'incidents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Incident List (Left Column) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Active Industrial Incidents
            </span>
            {incidents.length === 0 ? (
              <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-col items-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <span className="font-semibold text-sm">No Active OT Incidents</span>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Run a synthetic scenario above to inject IT/OT telemetry into the correlation grid.
                </p>
              </div>
            ) : (
              incidents.map((inc) => {
                const isSelected = selectedIncident?.incident_id === inc.incident_id
                return (
                  <div
                    key={inc.incident_id}
                    onClick={() => selectIncident(inc.incident_id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-hover)] border-cyan-500 shadow-sm'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400">{inc.incident_id}</span>
                      {inc.cross_zone_pivot && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Cross-Zone Pivot
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mt-1 line-clamp-1">{inc.title}</h3>
                    
                    {/* Separate Scores */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border)] text-center text-xs">
                      <div>
                        <span className="block text-[10px] text-[var(--text-muted)] uppercase">Priority</span>
                        <span className="font-bold text-sm text-cyan-400">{inc.impact_assessment.priority_score}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-muted)] uppercase">Severity</span>
                        <span className="font-bold text-sm text-amber-400 uppercase">{inc.impact_assessment.security_severity}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-[var(--text-muted)] uppercase">Mfg Impact</span>
                        <span className="font-bold text-sm text-red-400">{inc.impact_assessment.potential_manufacturing_impact_score}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Incident Detail & Explainability (Right Column) */}
          <div className="lg:col-span-8">
            {!selectedIncident ? (
              <div className="p-12 text-center bg-[var(--surface)] border border-[var(--border)] rounded-xl">
                <Info className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Select an incident to view operational explanation</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Header Card */}
                <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">{selectedIncident.incident_id}</span>
                        {selectedIncident.cross_zone_pivot && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Cross-Zone IT ➔ OT Lateral Movement
                          </span>
                        )}
                        {selectedIncident.impact_assessment.is_maintenance_suppressed && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Maintenance Dampened
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold mt-1">{selectedIncident.title}</h2>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Correlation Rationale: {selectedIncident.correlation_rationale}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[var(--text-muted)] uppercase font-semibold">Overall Priority</div>
                      <div className="text-3xl font-black text-cyan-400">{selectedIncident.impact_assessment.priority_score}<span className="text-sm font-normal text-[var(--text-muted)]">/100</span></div>
                    </div>
                  </div>

                  {/* Dual-Score Mathematical Transparency Banner */}
                  <div className="mt-4 p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] block">
                      {selectedIncident.impact_assessment.scoring_formula_explanation}
                    </span>
                  </div>
                </div>

                {/* AI Operational Assessment Card (Google Gemini Copilot) */}
                {explanation?.ai_operational_assessment && (
                  <div className="bg-gradient-to-r from-cyan-950/40 via-[var(--surface)] to-[var(--surface)] p-5 rounded-xl border border-cyan-500/30">
                    <div className="flex items-center gap-2 text-cyan-400 mb-3">
                      <Bot className="w-5 h-5" />
                      <h3 className="font-bold text-sm tracking-wide uppercase">
                        AI Operational Impact Synthesis ({explanation.ai_operational_assessment.engine || 'Google Gemini'})
                      </h3>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase block">Executive Summary</span>
                        <p className="text-[var(--text)] mt-0.5">{explanation.ai_operational_assessment.executive_summary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                          <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase block">Plant Floor Risk Assessment</span>
                          <p className="text-xs text-[var(--text)] mt-1">{explanation.ai_operational_assessment.operational_risk_assessment}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase block">OT Controls Briefing</span>
                          <p className="text-xs text-[var(--text)] mt-1">{explanation.ai_operational_assessment.ot_engineer_briefing}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Explainable Factual Narrative */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Facts Observed */}
                  <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 font-bold text-xs uppercase mb-3">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Factual Telemetry & Asset Records</span>
                    </div>
                    <ul className="space-y-2 text-xs text-[var(--text)]">
                      {explanation?.facts_observed?.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 dark:text-emerald-400 font-bold">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Hypotheses & Uncertainties */}
                  <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold text-xs uppercase mb-3">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Hypotheses & Missing Context</span>
                    </div>
                    <ul className="space-y-2 text-xs text-[var(--text)]">
                      {explanation?.hypotheses_and_possibilities?.map((hyp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                          <span>{hyp}</span>
                        </li>
                      ))}
                      {explanation?.missing_evidence_and_uncertainty?.map((miss, idx) => (
                        <li key={`miss-${idx}`} className="flex items-start gap-2 text-[var(--text-muted)]">
                          <span className="text-[var(--text-muted)]">?</span>
                          <span>{miss}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Correlated Event Timeline */}
                <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Correlated Telemetry Chronology
                  </h3>
                  <div className="space-y-3">
                    {selectedIncident.timeline?.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-xs">
                        <span className="font-mono text-cyan-400 whitespace-nowrap">{item.timestamp?.split('T')[1]?.split('.')[0] || item.timestamp}</span>
                        <div className="flex-1">
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

                {/* Policy-Gated Response Recommendations */}
                <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Operational Response Recommendations
                    </h3>
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                      <Lock className="w-3.5 h-3.5" /> Human Approval Enforced
                    </span>
                  </div>

                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.recommendation_id}
                        className={`p-4 rounded-xl border transition-all ${
                          rec.is_disruptive
                            ? 'bg-red-950/10 border-red-500/30'
                            : 'bg-[var(--surface-hover)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--text)]">{rec.title}</span>
                              {rec.is_disruptive ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/40">
                                  DISRUPTIVE ACTION
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                                  NON-DISRUPTIVE TRIAGE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1">{rec.description}</p>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-1 italic font-medium">
                              Safety Rationale: {rec.safety_rationale}
                            </span>
                          </div>

                          {/* Approval Actions */}
                          <div>
                            {rec.approval_status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprovalDecision(rec.recommendation_id, 'APPROVED')}
                                  disabled={actionLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Authorize</span>
                                </button>
                                <button
                                  onClick={() => handleApprovalDecision(rec.recommendation_id, 'REJECTED')}
                                  disabled={actionLoading}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-400 text-xs font-semibold transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                rec.approval_status === 'executed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-gray-700 text-gray-300'
                              }`}>
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

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Manufacturing Asset Registry ──────────────────── */}
      {activeTab === 'assets' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Simulated Factory Assets ({filteredAssets.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Filter:</span>
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs"
              >
                <option value="ALL">All Assets</option>
                <option value="level_1">Purdue L1 (PLCs)</option>
                <option value="level_2">Purdue L2 (SCADA/HMI)</option>
                <option value="level_3">Purdue L3 (Eng/Historian)</option>
                <option value="level_4">Purdue L4 (Enterprise IT)</option>
                <option value="critical">Critical Assets</option>
              </select>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Asset ID & Name</th>
                  <th className="p-3">Purdue Level</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Production Zone</th>
                  <th className="p-3">Criticality</th>
                  <th className="p-3">Owner Team</th>
                  <th className="p-3">Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAssets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 block">{asset.asset_id}</span>
                      <span className="font-semibold text-[var(--text)]">{asset.name}</span>
                    </td>
                    <td className="p-3">{getPurdueBadge(asset.purdue_level)}</td>
                    <td className="p-3 font-mono text-[var(--text-muted)]">{asset.ip_address}</td>
                    <td className="p-3">
                      <span className="text-[var(--text)] block font-medium">{asset.production_zone}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">{asset.network_segment}</span>
                    </td>
                    <td className="p-3">{getCriticalityBadge(asset.criticality)}</td>
                    <td className="p-3 text-[var(--text-muted)]">{asset.owner_team}</td>
                    <td className="p-3">
                      {asset.maintenance_window?.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active Window
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">Normal Run</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Scenario Demonstrator Lab ──────────────────────── */}
      {activeTab === 'scenarios' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] flex flex-col justify-between hover:border-cyan-500/50 transition-all"
              >
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {sc.category}
                  </span>
                  <h3 className="font-bold text-sm text-gray-200 mt-2">{sc.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">{sc.description}</p>
                </div>

                <button
                  onClick={() => handleRunScenario(sc.id)}
                  disabled={actionLoading}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[var(--surface-hover)] hover:bg-cyan-600 hover:text-white border border-[var(--border)] text-xs font-semibold transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Scenario</span>
                </button>
              </div>
            ))}
          </div>

          {scenarioResult && (
            <div className="bg-[var(--surface)] p-5 rounded-xl border border-cyan-500/30">
              <h3 className="font-bold text-sm text-cyan-400 mb-2">Last Scenario Execution Result: {scenarioResult.scenario}</h3>
              <p className="text-xs text-gray-300 font-medium">{scenarioResult.highlight}</p>
              {scenarioResult.comparison && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                    <span className="text-xs font-bold text-gray-400 uppercase">IT Workstation Assessment</span>
                    <pre className="text-[11px] font-mono mt-2 text-cyan-300 overflow-x-auto">
                      {JSON.stringify(scenarioResult.comparison.it_workstation, null, 2)}
                    </pre>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)]">
                    <span className="text-xs font-bold text-red-400 uppercase">PLC Controller Assessment</span>
                    <pre className="text-[11px] font-mono mt-2 text-red-300 overflow-x-auto">
                      {JSON.stringify(scenarioResult.comparison.plc_controller, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
