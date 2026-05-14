import { useState, useEffect } from 'react'
import { AlertCircle, ShieldAlert, CheckCircle2, ArrowUpRight } from 'lucide-react'
import axios from 'axios'

export default function Incidents() {
  const [cases, setCases] = useState([])
  
  const fetchCases = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:8000/api/cases`)
      setCases(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCases()
    const interval = setInterval(fetchCases, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (caseId, action) => {
    try {
      let data = {}
      if (action === 'escalate') data = { tier: 'L2' }
      if (action === 'close') data = { status: 'CLOSED' }
      
      await axios.post(`http://${window.location.hostname}:8000/api/cases/${caseId}/update`, data)
      fetchCases()
    } catch (err) {
      console.error(err)
    }
  }

  const l1Cases = cases.filter(c => c.tier !== 'L2' && c.status === 'OPEN')
  const l2Cases = cases.filter(c => c.tier === 'L2' && c.status === 'OPEN')
  const closedCases = cases.filter(c => c.status === 'CLOSED')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* L1 Queue */}
      <div className="col-span-1 flex flex-col gap-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-700 uppercase tracking-wider">
          <AlertCircle className="text-yellow-500 w-4 h-4" /> 
          L1 Analyst Queue
        </h2>
        {l1Cases.length === 0 ? <div className="text-slate-400 text-sm italic">No L1 cases pending.</div> : null}
        {l1Cases.map(c => (
          <CaseCard key={c.case_id} data={c} onAction={handleAction} type="L1" />
        ))}
      </div>

      {/* L2 Queue */}
      <div className="col-span-1 flex flex-col gap-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-700 uppercase tracking-wider">
          <ShieldAlert className="text-orange-500 w-4 h-4" /> 
          L2 Escalation Queue
        </h2>
        {l2Cases.length === 0 ? <div className="text-slate-400 text-sm italic">No L2 cases pending.</div> : null}
        {l2Cases.map(c => (
          <CaseCard key={c.case_id} data={c} onAction={handleAction} type="L2" />
        ))}
      </div>

      {/* Closed Queue */}
      <div className="col-span-1 flex flex-col gap-4">
        <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-700 uppercase tracking-wider">
          <CheckCircle2 className="text-green-500 w-4 h-4" /> 
          Closed / Contained
        </h2>
        {closedCases.length === 0 ? <div className="text-slate-400 text-sm italic">No closed cases.</div> : null}
        {closedCases.map(c => (
          <div key={c.case_id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 opacity-60">
            <h3 className="font-semibold text-sm line-through text-slate-500">{c.title}</h3>
            <span className="text-xs text-slate-400">{c.case_id}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaseCard({ data, onAction, type }) {
  return (
    <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm text-slate-800">{data.title}</h3>
        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{data.case_id}</span>
      </div>
      <div className="text-[11px] text-slate-500 mb-4 font-medium">
        Created: {new Date(data.created_at).toLocaleString()}
      </div>
      
      <div className="flex gap-2">
        {type === 'L1' && (
          <button onClick={() => onAction(data.case_id, 'escalate')} className="flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-md transition-colors">
            <ArrowUpRight className="w-3 h-3" /> Escalate to L2
          </button>
        )}
        <button onClick={() => onAction(data.case_id, 'close')} className="flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-md transition-colors">
          <CheckCircle2 className="w-3 h-3" /> Contain & Close
        </button>
      </div>
    </div>
  )
}

