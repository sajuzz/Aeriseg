import { useState, useEffect } from 'react'
import {
  Shield, Search, List, Activity, LayoutDashboard, FileText,
  Settings, HelpCircle, Server, Database, PieChart, LogOut,
  Code, Monitor, Users, ChevronRight, Moon, Sun, Palette, Bell,
  PanelLeftClose, PanelLeftOpen, CheckCircle2, RefreshCw, Hexagon, Box
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { useThemeStore } from '../store/useThemeStore'
import EventDrawer from '../components/events/EventDrawer'
import { useSocStore } from '../store/useSocStore'

export default function SidebarLayout({ children }) {
  const location  = useLocation()
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()
  
  const { theme, toggleTheme, primaryColor, setPrimaryColor, initTheme } = useThemeStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showColorModal, setShowColorModal] = useState(false)
  const { wsStatus, alerts } = useSocStore()

  useEffect(() => {
    initTheme()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleGlobalPivot = (key, value) => {
    navigate(`/hunt?q=${encodeURIComponent(`${key}:${value}`)}`)
  }

  const breadcrumbMap = {
    '/':               'Summary Dashboard',
    '/dashboards':     'Custom Dashboards',
    '/documentation':  'Documentation',
    '/users':          'User Management',
    '/hunt':           'Threat Hunting',
    '/alerts':         'Alert Queue',
    '/investigations': 'Investigations',
    '/assets':         'Assets',
    '/agents':         'Security Agents',
    '/rules':          'Detection Rules',
    '/intel':          'Threat Intelligence',
    '/reports':        'Reports',
    '/data-sources':   'Data Sources',
    '/timeline':       'Attack Timeline',
    '/rules/new':      'Sigma Rule Builder',
    '/simulator':      'Detection Lab',
    '/settings':       'Grid Settings',
  }
  const currentPage = breadcrumbMap[location.pathname] || 'AeriSeg'

  // Service Health (simulated backend status for demo, real WS for wsStatus)
  const services = [
    { name: 'Backend', status: 'healthy' },
    { name: 'Database', status: 'healthy' },
    { name: 'Detection Engine', status: 'healthy' },
    { name: 'WebSocket', status: wsStatus ? 'healthy' : 'error' },
    { name: 'Agent RPC', status: 'healthy' }
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text)] transition-colors duration-300">
      
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[var(--surface)] border-r border-[var(--border)] flex flex-col flex-shrink-0 transition-all duration-300 z-20`}>
        
        {/* Logo */}
        <div className="p-4 h-16 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white p-1 shadow-sm">
               <img src="/logo-original.png" alt="AeriSeg" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-semibold tracking-tight text-xl">AeriSeg</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
          <NavSection title="Monitoring" isCollapsed={isCollapsed}>
            <NavLink to="/" icon={LayoutDashboard} active={location.pathname === '/'} isCollapsed={isCollapsed}>Dashboard</NavLink>
            <NavLink to="/data-sources" icon={Database} active={location.pathname === '/data-sources'} isCollapsed={isCollapsed}>Data Sources</NavLink>
          </NavSection>

          <NavSection title="Operations" isCollapsed={isCollapsed}>
            <NavLink to="/hunt" icon={Search} active={location.pathname === '/hunt'} isCollapsed={isCollapsed}>Threat Hunt</NavLink>
            <NavLink to="/alerts" icon={List} active={location.pathname === '/alerts'} isCollapsed={isCollapsed} badge={alerts?.filter(a=>a.status==='NEW').length || 0}>Alerts</NavLink>
            <NavLink to="/investigations" icon={Activity} active={location.pathname.startsWith('/investigations')} isCollapsed={isCollapsed}>Investigations</NavLink>
            <NavLink to="/timeline" icon={Activity} active={location.pathname === '/timeline'} isCollapsed={isCollapsed}>Attack Timeline</NavLink>
          </NavSection>

          <NavSection title="Infrastructure" isCollapsed={isCollapsed}>
            <NavLink to="/agents" icon={Monitor} active={location.pathname === '/agents'} isCollapsed={isCollapsed}>Agents</NavLink>
            <NavLink to="/assets" icon={Server} active={location.pathname === '/assets'} isCollapsed={isCollapsed}>Assets</NavLink>
            <NavLink to="/integrations" icon={Box} active={location.pathname === '/integrations'} isCollapsed={isCollapsed}>Integrations</NavLink>
          </NavSection>

          <NavSection title="Configuration" isCollapsed={isCollapsed}>
            <NavLink to="/rules" icon={Code} active={location.pathname.startsWith('/rules')} isCollapsed={isCollapsed}>Rules</NavLink>
            <NavLink to="/playbooks/designer" icon={Box} active={location.pathname.startsWith('/playbooks')} isCollapsed={isCollapsed}>SOAR Designer</NavLink>
            <NavLink to="/simulator" icon={Hexagon} active={location.pathname === '/simulator'} isCollapsed={isCollapsed}>Detection Lab</NavLink>
          </NavSection>

          <NavSection title="Administration" isCollapsed={isCollapsed}>
            <NavLink to="/users" icon={Users} active={location.pathname === '/users'} isCollapsed={isCollapsed}>Users</NavLink>
            <NavLink to="/settings" icon={Settings} active={location.pathname === '/settings'} isCollapsed={isCollapsed}>Settings</NavLink>
            <NavLink to="/documentation" icon={HelpCircle} active={location.pathname === '/documentation'} isCollapsed={isCollapsed}>Docs</NavLink>
          </NavSection>
        </div>

        {/* Bottom Panel */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all w-full ${isCollapsed ? 'justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" /> 
            {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">

        {/* Live Status Bar */}
        <div className="h-8 bg-[var(--surface-hover)] border-b border-[var(--border)] flex items-center justify-between px-6 text-[11px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">
          <div className="flex items-center gap-6">
            {services.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shadow-sm ${s.status === 'healthy' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[rgb(var(--primary))]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing Grid</span>
          </div>
        </div>

        {/* Top Header */}
        <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-8 flex-shrink-0 z-10">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)] font-medium">AeriSeg</span>
            <ChevronRight className="w-4 h-4 text-[var(--border)]" />
            <span className="text-[var(--text)] font-semibold">{currentPage}</span>
          </div>
          
          {/* Search */}
          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <input type="text" 
                     className="w-full bg-[var(--background)] border border-transparent focus:border-[rgb(var(--primary))] rounded-3xl py-2 px-5 pl-11 text-sm focus:outline-none transition-colors"
                     placeholder="Search events, agents, or rules..." />
              <Search className="w-4 h-4 absolute left-4 top-2.5 text-[var(--text-muted)]" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-5">
            <button onClick={() => setShowColorModal(true)} 
                    className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[rgb(var(--primary))] transition-colors">
              <Palette className="w-5 h-5" />
              <span className="hidden md:inline font-medium">Theme</span>
            </button>
            
            <button onClick={toggleTheme} className="text-[var(--text-muted)] hover:text-[rgb(var(--primary))] transition-colors">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button className="relative text-[var(--text-muted)] hover:text-[rgb(var(--primary))] transition-colors">
                <Bell className="w-5 h-5" />
                {alerts?.filter(a=>a.status==='NEW').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {alerts.filter(a=>a.status==='NEW').length}
                  </span>
                )}
              </button>
            </div>
            
            <div className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text)] font-semibold text-xs">
               {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>

      <EventDrawer onPivot={handleGlobalPivot} />

      {/* Color Modal */}
      {showColorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] rounded-3xl p-8 w-[420px] shadow-2xl border border-[var(--border)]">
            <h3 className="font-semibold text-lg mb-6 text-[var(--text)]">Choose Accent Color</h3>
            <div className="grid grid-cols-6 gap-4">
              <ColorBtn color="234 179 8" bgClass="bg-yellow-500" onClick={() => { setPrimaryColor("234 179 8"); setShowColorModal(false) }} current={primaryColor} />
              <ColorBtn color="59 130 246" bgClass="bg-blue-500" onClick={() => { setPrimaryColor("59 130 246"); setShowColorModal(false) }} current={primaryColor} />
              <ColorBtn color="16 185 129" bgClass="bg-emerald-500" onClick={() => { setPrimaryColor("16 185 129"); setShowColorModal(false) }} current={primaryColor} />
              <ColorBtn color="236 72 153" bgClass="bg-pink-500" onClick={() => { setPrimaryColor("236 72 153"); setShowColorModal(false) }} current={primaryColor} />
              <ColorBtn color="139 92 246" bgClass="bg-violet-500" onClick={() => { setPrimaryColor("139 92 246"); setShowColorModal(false) }} current={primaryColor} />
              <ColorBtn color="64 130 109" style={{ backgroundColor: '#40826D' }} onClick={() => { setPrimaryColor("64 130 109"); setShowColorModal(false) }} current={primaryColor} />
            </div>
            <button onClick={() => setShowColorModal(false)} 
                    className="mt-8 w-full py-3 bg-[var(--background)] hover:bg-[var(--surface-hover)] rounded-2xl text-sm font-medium transition-colors text-[var(--text)] border border-[var(--border)]">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorBtn({ color, bgClass, style, onClick, current }) {
  const active = current === color;
  return (
    <button onClick={onClick} className={`w-12 h-12 rounded-2xl ${bgClass || ''} transition-transform hover:scale-110 flex items-center justify-center shadow-lg`} style={style}>
      {active && <div className="w-4 h-4 bg-siem-panel rounded-full opacity-50" />}
    </button>
  )
}

function NavSection({ title, children, isCollapsed }) {
  return (
    <div className="mb-4">
      {!isCollapsed && (
        <div className="px-3 text-xs font-semibold text-[var(--text-muted)] mb-2 mt-4 uppercase tracking-wider">
          {title}
        </div>
      )}
      {isCollapsed && <div className="h-px bg-[var(--border)] mb-4 mx-4 mt-6" />}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  )
}

function NavLink({ to, icon: Icon, children, active, isCollapsed, badge }) {
  return (
    <Link
      to={to}
      title={isCollapsed ? children : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all relative
        ${active
          ? 'bg-[rgb(var(--primary),0.1)] text-[rgb(var(--primary))]'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
        } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && <span className="truncate flex-1">{children}</span>}
      {!isCollapsed && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          {badge}
        </span>
      )}
      {isCollapsed && badge > 0 && (
        <span className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full shadow-sm shadow-red-500/50" />
      )}
    </Link>
  )
}
