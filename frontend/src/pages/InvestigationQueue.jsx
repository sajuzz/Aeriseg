import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Shield, Clock, AlertTriangle, ChevronRight, Plus } from 'lucide-react';

export default function InvestigationQueue() {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestigations = async () => {
    try {
      const res = await axios.get('/api/investigations');
      setInvestigations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const createNew = async () => {
    const title = prompt("Enter investigation title:");
    if (!title) return;
    try {
      await axios.post('/api/investigations', { title });
      fetchInvestigations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Investigation Queue</h1>
          <p className="text-slate-500 text-sm">Manage and prioritize active security investigations.</p>
        </div>
        <button 
          onClick={createNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Investigation
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
            <tr>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Severity</th>
              <th className="px-6 py-3">Last Updated</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {investigations.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-6 py-4">
                  <Link to={`/investigations/${inv.id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                    {inv.title}
                  </Link>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.id}</div>
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={inv.severity} />
                </td>
                <td className="px-6 py-4 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(inv.updated_at).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/investigations/${inv.id}`} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full inline-block transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {investigations.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 italic font-medium">No investigations in queue.</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
    INVESTIGATING: "bg-orange-50 text-orange-700 border-orange-200",
    CLOSED: "bg-slate-50 text-slate-600 border-slate-200"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    CRITICAL: "text-red-600 font-bold",
    HIGH: "text-orange-600 font-bold",
    MEDIUM: "text-yellow-600 font-bold",
    LOW: "text-green-600 font-bold"
  };
  return (
    <span className={`text-[11px] uppercase tracking-wide ${styles[severity] || 'text-slate-500'}`}>
      {severity}
    </span>
  );
}
