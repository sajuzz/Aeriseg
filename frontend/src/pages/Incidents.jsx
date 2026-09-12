import { useState, useEffect } from 'react'
import { AlertCircle, ShieldAlert, CheckCircle2, Flame, User, Monitor, Network } from 'lucide-react'
import axios from 'axios'
import StatusBadge from '../components/StatusBadge'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  
  const fetchIncidents = async () => {
    try {
      const res = await axios.get('/api/incidents')
      setIncidents(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (incidentId, action) => {
    // We can add actions to close/investigate incidents here
    if (action === 'close') {
       // just for mockup since we don't have update endpoint yet
       setIncidents(prev => prev.filter(i => i.id !== incidentId))
    }
  }

  const activeIncidents = incidents.filter(i => i.status === 'OPEN').sort((a, b) => b.risk_score - a.risk_score)

  return (
    <div className="flex flex-col gap-6 -m-6 p-6 min-h-[calc(100vh-64px)] bg-siem-bg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-xl border border-red-200">
            <Flame className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-siem-text tracking-tight">Risk-Based Incidents</h1>
            <p className="text-sm text-siem-muted font-medium mt-0.5">Alerts grouped by entity with dynamic risk scoring</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading && activeIncidents.length === 0 ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-siem-panel rounded-2xl border border-siem-border"></div>)}
          </div>
        ) : activeIncidents.length === 0 ? (
          <div className="p-8 text-center bg-siem-panel border border-siem-border rounded-2xl flex flex-col items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-siem-text">No Active Incidents</h3>
            <p className="text-siem-muted mt-2">The environment is secure. No entities exceed risk thresholds.</p>
          </div>
        ) : (
          activeIncidents.map(inc => <IncidentCard key={inc.id} data={inc} onAction={handleAction} />)
        )}
      </div>
    </div>
  )
}

function IncidentCard({ data, onAction }) {
  const getEntityIcon = (type) => {
    if (type === 'USER') return <User className="w-4 h-4 text-purple-600" />
    if (type === 'HOST') return <Monitor className="w-4 h-4 text-blue-600" />
    return <Network className="w-4 h-4 text-emerald-600" />
  }
  
  const isHighRisk = data.risk_score >= 80

  return (
    <div className={`p-6 rounded-2xl bg-siem-panel border transition-all ${isHighRisk ? 'border-red-300 shadow-md shadow-red-50' : 'border-siem-border shadow-sm'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold text-siem-muted bg-slate-100 border border-siem-border px-2 py-0.5 rounded">{data.id}</span>
            <div className={`px-2 py-0.5 rounded flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${isHighRisk ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
               Risk Score: {data.risk_score}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest border border-slate-200">
               {getEntityIcon(data.entity_type)}
               {data.entity_type}: {data.entity_value}
            </div>
          </div>
          <h3 className="font-bold text-lg text-siem-text">{data.title}</h3>
        </div>
        
        <button onClick={() => onAction(data.id, 'close')} className="flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-md transition-colors">
          <CheckCircle2 className="w-3 h-3" /> Contain & Close
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-siem-border">
        <h4 className="text-xs font-bold uppercase tracking-widest text-siem-muted mb-3 flex items-center gap-2">
           <ShieldAlert className="w-3.5 h-3.5" />
           Correlated Alerts ({data.alerts?.length || 0})
        </h4>
        <div className="space-y-2">
          {data.alerts?.map((alert, idx) => (
             <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-siem-bg border border-slate-100">
                <div className="flex items-center gap-3">
                   <StatusBadge status={alert.severity} />
                   <span className="text-sm font-semibold text-slate-700">{alert.title}</span>
                </div>
                <span className="text-xs text-siem-muted font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  )
}

