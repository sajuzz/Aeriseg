import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { User, ShieldAlert, Activity, RefreshCw, ExternalLink } from 'lucide-react';



export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);


  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get('/api/alerts');
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(() => fetchAlerts(true), 5000);
    return () => clearInterval(id);
  }, []);

  const promoteAlert = async (alertId) => {
    try {
      const res = await axios.post(`/api/alerts/${alertId}/promote`);
      if (res.data.status === 'success') {
        navigate(`/investigations/${res.data.investigation_id}`);
      }
    } catch (err) {
      alert("Failed to promote alert");
    }
  };

  const runDetections = async () => {
    setLoading(true);
    try {
      await axios.post('/api/detections/run');
      await fetchAlerts();
    } catch (err) {
      console.error("Failed to run detections", err);
      setLoading(false);
    }
  };

  const assignAlert = async (alertId, userId) => {
    try {
      await axios.patch(`/api/alerts/${alertId}/assign`, { user_id: userId });
      fetchAlerts();
    } catch (err) {
      alert("Failed to assign alert");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-xl border border-red-200">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Detection Alerts</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Prioritized leads for investigation</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={runDetections}
             disabled={loading}
             className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
           >
             <Activity className="w-4 h-4 text-blue-600" /> Run Detections
           </button>
           <button 
             onClick={fetchAlerts}
             disabled={loading}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 transition-all"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
           </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading && alerts.length === 0 ? (
           <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Loading alerts...</div>
        ) : alerts.length === 0 ? (
           <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <ShieldAlert className="w-8 h-8 text-slate-300" />
              </div>
              No open alerts at this time.
           </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="p-4 pl-6 font-medium">Severity</th>
                <th className="p-4 font-medium">Detection Title</th>
                <th className="p-4 font-medium text-center">Hits</th>
                <th className="p-4 font-medium">Owner</th>
                <th className="p-4 font-medium">Confidence</th>
                <th className="p-4 font-medium">MITRE Technique</th>
                <th className="p-4 font-medium">Last Seen</th>
                <th className="p-4 pr-6 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {alerts.map(alert => (
                <tr key={alert.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 pl-6">
                    <StatusBadge status={alert.severity} />
                  </td>
                  <td className="p-4">
                    <Link to={`/alerts/workbench/${alert.id}`} className="group/link flex items-center gap-2">
                      <div className="font-bold text-slate-900 group-hover/link:text-blue-600 transition-colors uppercase tracking-tight">{alert.title}</div>
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/link:opacity-100 transition-all" />
                    </Link>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{alert.rule_id}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-slate-100 text-slate-700 rounded-md font-bold text-xs border border-slate-200">
                      {alert.dedup_count}
                    </span>
                  </td>
                  <td className="p-4">
                    {alert.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                          {alert.assigned_username.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{alert.assigned_username}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => assignAlert(alert.id, user.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                      >
                        <User className="w-3 h-3" /> Unassigned
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-xs font-black">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${alert.confidence_score > 70 ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${alert.confidence_score}%` }} />
                      </div>
                      <span className="text-slate-700">{alert.confidence_score}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-500 font-bold siem-mono">
                    {alert.mitre_technique || "N/A"}
                  </td>
                  <td className="p-4 text-xs text-slate-500 font-medium">
                    {new Date(alert.last_seen).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={() => promoteAlert(alert.id)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 rounded-md text-xs font-bold text-slate-600 transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                    >
                      Investigate <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
