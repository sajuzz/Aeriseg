import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus, Shield, Trash2, Users as UsersIcon, ShieldCheck,
  Activity, Database, Server, Cpu, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Health status helpers ────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'online' || status === 'active') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  }
  if (status === 'warning' || status === 'degraded') {
    return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  }
  return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
}

function StatusPill({ status }) {
  const cfg = {
    online:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning:  'bg-amber-50  text-amber-700  border-amber-200',
    degraded: 'bg-amber-50  text-amber-700  border-amber-200',
    error:    'bg-red-50    text-red-700    border-red-200',
    offline:  'bg-red-50    text-red-700    border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${cfg[status] || 'bg-siem-bg text-siem-muted border-siem-border'}`}>
      {status}
    </span>
  );
}

const COMPONENT_ICONS = {
  database:         <Database className="w-4 h-4 text-blue-500" />,
  detection_engine: <Cpu      className="w-4 h-4 text-indigo-500" />,
  ingestion:        <Activity className="w-4 h-4 text-emerald-500" />,
  auth_system:      <Shield   className="w-4 h-4 text-amber-500" />,
};

const COMPONENT_LABELS = {
  database:         'Database',
  detection_engine: 'Detection Engine',
  ingestion:        'Ingestion Pipeline',
  auth_system:      'Auth & Identity',
};

// ─── Application Health Sub-section ──────────────────────────────────────────
function ApplicationHealth() {
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [spinning, setSpinning]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchHealth = async () => {
    setSpinning(true);
    setLoading(true);
    try {
      const res = await axios.get('/api/system/health');
      setHealth(res.data);
    } catch (err) {
      console.error('Health fetch failed:', err);
      setHealth(null);
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  const overallOk = health?.status === 'healthy';

  return (
    <div className="bg-siem-panel border border-siem-border rounded-2xl shadow-sm overflow-hidden">

      {/* Section header */}
      <div className="flex items-center justify-between p-5 border-b border-siem-border bg-siem-bg/60">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${overallOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <Server className={`w-5 h-5 ${overallOk ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h2 className="text-sm font-black text-siem-text uppercase tracking-tight">Application Health</h2>
            <p className="text-[10px] text-siem-muted font-bold uppercase tracking-widest mt-0.5">
              Live component diagnostics · auto-refreshes every 30s
            </p>
          </div>
          {health && (
            <StatusPill status={health.status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHealth}
            title="Refresh health"
            className="p-1.5 rounded-lg border border-siem-border hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-siem-muted ${spinning ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded-lg border border-siem-border hover:bg-slate-100 transition-colors"
          >
            {collapsed
              ? <ChevronDown className="w-3.5 h-3.5 text-siem-muted" />
              : <ChevronUp   className="w-3.5 h-3.5 text-siem-muted" />
            }
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-5">
          {loading && !health ? (
            <div className="text-center py-8 text-xs font-bold text-siem-muted uppercase tracking-widest animate-pulse">
              Running diagnostics…
            </div>
          ) : !health ? (
            <div className="text-center py-8 text-xs font-bold text-red-400 uppercase tracking-widest flex flex-col items-center gap-2">
              <XCircle className="w-6 h-6" />
              Could not reach backend — is the server running?
            </div>
          ) : (
            <div className="space-y-4">

              {/* Component grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(health.components || {}).map(([key, comp]) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-4 rounded-xl border border-siem-border bg-siem-bg/40 hover:bg-siem-bg transition-colors"
                  >
                    <div className="p-2 bg-siem-panel rounded-lg border border-siem-border shadow-sm flex-shrink-0">
                      {COMPONENT_ICONS[key] || <Server className="w-4 h-4 text-siem-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                          {COMPONENT_LABELS[key] || key}
                        </span>
                        <StatusPill status={comp.status} />
                      </div>
                      <div className="text-[10px] text-siem-muted font-medium space-y-0.5">
                        {comp.size_mb     !== undefined && <div>Database size: <span className="font-bold text-siem-text">{comp.size_mb} MB</span></div>}
                        {comp.rules_loaded !== undefined && <div>Rules loaded: <span className="font-bold text-siem-text">{comp.rules_loaded}</span></div>}
                        {comp.events_last_hour !== undefined && <div>Events last hour: <span className="font-bold text-siem-text">{comp.events_last_hour.toLocaleString()}</span></div>}
                        {comp.users_registered !== undefined && <div>Users registered: <span className="font-bold text-siem-text">{comp.users_registered}</span></div>}
                        {comp.message     !== undefined && <div className="text-amber-600">{comp.message}</div>}
                      </div>
                    </div>
                    <StatusIcon status={comp.status} />
                  </div>
                ))}
              </div>

              {/* Stack info */}
              {health.stack && (
                <div className="border-t border-siem-border pt-4">
                  <div className="text-[10px] font-black text-siem-muted uppercase tracking-[0.15em] mb-3">Platform Stack</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(health.stack).map(([k, v]) => (
                      <div key={k} className="px-3 py-2 bg-siem-bg border border-siem-border rounded-lg">
                        <div className="text-[9px] font-black text-siem-muted uppercase tracking-widest">{k}</div>
                        <div className="text-[10px] font-bold text-siem-text mt-0.5 truncate" title={v}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main User Management Page ────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '', password: '', full_name: '', role: 'ANALYST',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      setFetchError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', formData);
      setShowModal(false);
      setFormData({ username: '', password: '', full_name: '', role: 'ANALYST' });
      fetchUsers();
    } catch (err) {
      alert('Failed to create user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user account permanently?')) return;
    try {
      await axios.delete(`/api/users/${userId}`);
      fetchUsers();
    } catch {
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* ── Section: Identity Management ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl border border-blue-200">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-siem-text tracking-tight">Identity Management</h1>
              <p className="text-sm text-siem-muted font-medium mt-0.5">Manage AeriSeg personnel accounts and access roles</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm shadow-blue-200 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* User table */}
        <div className="bg-siem-panel border border-siem-border rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-siem-bg border-b border-siem-border text-[10px] uppercase tracking-widest text-siem-muted font-black">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Account ID</th>
                <th className="p-4">Created</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-siem-muted animate-pulse font-medium text-xs uppercase tracking-widest">
                    Synchronizing identities…
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-amber-500 font-medium text-xs">
                    {fetchError === 'Forbidden' 
                      ? 'Access Restricted: Administrator privileges required to inspect user credentials.' 
                      : `Sync status: ${fetchError}`}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-siem-muted text-xs font-bold uppercase tracking-widest">
                    No users found
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-siem-bg/50 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-black text-blue-600 border border-blue-100">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-siem-text">{u.full_name}</div>
                        <div className="text-[10px] text-siem-muted font-mono">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border
                      ${u.role === 'ADMIN'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50  text-blue-700  border-blue-200'}`}
                    >
                      {u.role === 'ADMIN'
                        ? <Shield      className="w-3 h-3" />
                        : <ShieldCheck className="w-3 h-3" />
                      }
                      {u.role}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-mono text-siem-muted">
                    UID-{String(u.id).padStart(4, '0')}
                  </td>
                  <td className="p-4 text-xs text-siem-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section: Application Health ── */}
      <div>
        <ApplicationHealth />
      </div>

      {/* ── Create User Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-siem-panel rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-siem-border">
            <div className="p-6 border-b border-siem-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-siem-text">Provision New Identity</h2>
                <p className="text-xs text-siem-muted font-medium mt-0.5">New account will require password change on first login</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-siem-muted hover:text-siem-muted text-xl font-black w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text" required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-siem-bg border border-siem-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Security Analyst"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest ml-1">Username</label>
                  <input
                    type="text" required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 bg-siem-bg border border-siem-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="analyst_02"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest ml-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-siem-bg border border-siem-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="ANALYST">ANALYST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-siem-muted uppercase tracking-widest ml-1">Temporary Password</label>
                <input
                  type="password" required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-siem-bg border border-siem-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all mt-2"
              >
                Complete Provisioning
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
