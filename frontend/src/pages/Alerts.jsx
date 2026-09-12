import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { User, ShieldAlert, Activity, RefreshCw, ExternalLink, Calendar, Search, Download } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Time Filtering State
  const [timeFilter, setTimeFilter] = useState('24h');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  // Quick Filters State
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const fetchAlerts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let url = `/api/alerts?time=${timeFilter}`;
      if (timeFilter === 'custom' && fromTime && toTime) {
         url = `/api/alerts?from_time=${new Date(fromTime).toISOString()}&to_time=${new Date(toTime).toISOString()}`;
      }
      const res = await axios.get(url);
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Auto Refresh Logic
    const autoRefreshEligible = ['15m', '1h', 'today', '24h'].includes(timeFilter);
    let id;
    if (autoRefreshEligible) {
       id = setInterval(() => fetchAlerts(true), 5000);
    }
    return () => {
       if (id) clearInterval(id);
    };
  }, [timeFilter, fromTime, toTime]);

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

  // Client-side filtering
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
       if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
       if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.rule_id.toLowerCase().includes(search.toLowerCase())) return false;
       return true;
    });
  }, [alerts, severityFilter, search]);

  const exportCSV = () => {
    const headers = "ID,Title,Severity,Source IP,Hits,MITRE,Confidence,Occurred At\n";
    const rows = filteredAlerts.map(a => 
      `${a.id},"${a.title}",${a.severity},${a.source_ip || ''},${a.dedup_count},${a.mitre_technique || 'N/A'},${a.confidence_score},${a.occurred_at || a.last_seen}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_export_${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-xl border border-red-200">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-siem-text tracking-tight">Detection Alerts</h1>
            <p className="text-sm text-siem-muted font-medium mt-0.5">Prioritized leads for investigation</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={runDetections}
             disabled={loading}
             className="px-4 py-2 bg-siem-panel border border-siem-border text-siem-text rounded-lg text-sm font-bold hover:bg-siem-bg flex items-center gap-2 shadow-sm transition-all"
           >
             <Activity className="w-4 h-4 text-blue-600" /> Run Detections
           </button>
           <button 
             onClick={exportCSV}
             className="px-4 py-2 bg-siem-panel border border-siem-border text-siem-text rounded-lg text-sm font-bold hover:bg-siem-bg flex items-center gap-2 shadow-sm transition-all"
           >
             <Download className="w-4 h-4 text-siem-muted" /> Export
           </button>
           <button 
             onClick={() => fetchAlerts()}
             disabled={loading}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 transition-all"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
           </button>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-siem-panel p-4 border border-siem-border rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap flex-1">
           <div className="relative w-64 mr-2">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-siem-muted" />
             <input 
               type="text" 
               placeholder="Search alerts..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-3 py-2 bg-siem-bg border border-siem-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
           </div>
           
           {/* Quick Filter Chips */}
           <button onClick={() => setTimeFilter('today')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${timeFilter==='today' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-siem-panel border-siem-border text-siem-muted hover:bg-siem-bg'}`}>Today</button>
           <button onClick={() => setTimeFilter('yesterday')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${timeFilter==='yesterday' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-siem-panel border-siem-border text-siem-muted hover:bg-siem-bg'}`}>Yesterday</button>
           <button onClick={() => setTimeFilter('7d')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${timeFilter==='7d' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-siem-panel border-siem-border text-siem-muted hover:bg-siem-bg'}`}>7 Days</button>
           <button onClick={() => setTimeFilter('this_month')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${timeFilter==='this_month' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-siem-panel border-siem-border text-siem-muted hover:bg-siem-bg'}`}>This Month</button>
           
           <div className="w-px h-6 bg-slate-200 mx-1"></div>
           
           <button onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${severityFilter==='CRITICAL' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-siem-panel border-siem-border text-siem-muted hover:bg-siem-bg'}`}>Critical Only</button>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
             <div className="flex items-center bg-siem-bg border border-siem-border rounded-lg p-1">
               <Calendar className="w-4 h-4 text-siem-muted ml-2 mr-1" />
               <select 
                 value={timeFilter} 
                 onChange={e => {
                   setTimeFilter(e.target.value);
                   setShowCustom(e.target.value === 'custom');
                 }}
                 className="bg-transparent border-none text-sm font-bold text-siem-text py-1 pr-8 focus:ring-0 cursor-pointer"
               >
                 <option value="15m">Last 15 Minutes</option>
                 <option value="1h">Last 1 Hour</option>
                 <option value="24h">Last 24 Hours</option>
                 <option value="today">Today</option>
                 <option value="yesterday">Yesterday</option>
                 <option value="7d">Last 7 Days</option>
                 <option value="this_month">This Month</option>
                 <option value="custom">Custom Range...</option>
               </select>
             </div>
           </div>
        </div>
      </div>
      
      {/* Custom Date Range Picker */}
      {showCustom && (
         <div className="bg-siem-panel border border-siem-border text-siem-text p-4 rounded-xl flex items-end gap-4 shadow-lg animate-in slide-in-from-top-2">
            <div>
               <label className="block text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-1">From</label>
               <input type="datetime-local" value={fromTime} onChange={e => setFromTime(e.target.value)} className="bg-siem-bg border border-siem-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
               <label className="block text-[10px] font-bold text-siem-muted uppercase tracking-widest mb-1">To</label>
               <input type="datetime-local" value={toTime} onChange={e => setToTime(e.target.value)} className="bg-siem-bg border border-siem-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => fetchAlerts()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors">
               Apply Range
            </button>
         </div>
      )}

      <div className="bg-siem-panel border border-siem-border rounded-2xl shadow-sm overflow-hidden">
        {loading && alerts.length === 0 ? (
           <div className="p-12 text-center text-siem-muted font-medium animate-pulse">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
           <div className="p-16 text-center text-siem-muted font-medium flex flex-col items-center">
              <div className="w-16 h-16 bg-siem-bg rounded-full flex items-center justify-center mb-4 border border-siem-border">
                <ShieldAlert className="w-8 h-8 text-slate-300" />
              </div>
              No alerts found for this time range and filter.
           </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-siem-bg border-b border-siem-border text-[10px] uppercase tracking-widest text-siem-muted font-bold">
                <th className="p-4 pl-6 font-medium">Severity</th>
                <th className="p-4 font-medium">Detection Title</th>
                <th className="p-4 font-medium text-center">Hits</th>
                <th className="p-4 font-medium">Owner</th>
                <th className="p-4 font-medium">Confidence</th>
                <th className="p-4 font-medium">MITRE Technique</th>
                <th className="p-4 font-medium">Occurred At</th>
                <th className="p-4 pr-6 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-siem-border text-sm">
              {filteredAlerts.map(alert => {
                const dateObj = new Date(alert.occurred_at || alert.last_seen);
                const dateStr = dateObj.toISOString().split('T')[0];
                const timeStr = dateObj.toISOString().split('T')[1].substring(0, 8) + ' UTC';
                
                return (
                <tr key={alert.id} className="hover:bg-siem-bg transition-colors group">
                  <td className="p-4 pl-6">
                    <StatusBadge status={alert.severity} />
                  </td>
                  <td className="p-4">
                    <Link to={`/alerts/workbench/${alert.id}`} className="group/link flex items-center gap-2">
                      <div className="font-bold text-siem-text group-hover/link:text-blue-600 transition-colors uppercase tracking-tight">{alert.title}</div>
                      <ExternalLink className="w-3 h-3 text-siem-muted opacity-0 group-hover/link:opacity-100 transition-all" />
                    </Link>
                    <div className="text-[10px] text-siem-muted font-mono mt-0.5">{alert.rule_id}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-slate-100 text-siem-text rounded-md font-bold text-xs border border-siem-border">
                      {alert.dedup_count}
                    </span>
                  </td>
                  <td className="p-4">
                    {alert.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                          {alert.assigned_username.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-siem-text">{alert.assigned_username}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => assignAlert(alert.id, user.id)}
                        className="text-[10px] font-black uppercase tracking-widest text-siem-muted hover:text-blue-600 flex items-center gap-1 transition-colors"
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
                      <span className="text-siem-text">{alert.confidence_score}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-siem-muted font-bold siem-mono">
                    {alert.mitre_technique || "N/A"}
                  </td>
                  <td className="p-4 text-xs text-siem-muted font-medium">
                    <div className="font-bold text-siem-text">{dateStr}</div>
                    <div className="text-[10px] text-siem-muted font-mono mt-0.5">{timeStr}</div>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={() => promoteAlert(alert.id)}
                      className="px-3 py-1.5 bg-siem-panel border border-siem-border hover:border-blue-300 hover:text-blue-700 rounded-md text-xs font-bold text-siem-muted transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                    >
                      Investigate <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
