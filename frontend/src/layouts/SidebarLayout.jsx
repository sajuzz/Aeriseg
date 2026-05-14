import {
  Shield, Search, List, Activity, LayoutDashboard, FileText,
  Settings, HelpCircle, Server, Database, PieChart, LogOut,
  Code, Monitor, Users, ChevronRight
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import EventDrawer from '../components/events/EventDrawer'

export default function SidebarLayout({ children }) {
  const location  = useLocation()
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()

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
  }
  const currentPage = breadcrumbMap[location.pathname] || 'AeriSeg'

  return (
    <div className="flex h-screen bg-siem-bg text-siem-text font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-64 bg-siem-panel border-r border-siem-border flex flex-col flex-shrink-0 shadow-xl z-10">

        {/* Logo */}
        <div className="p-4 border-b border-siem-border flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-white uppercase">AeriSeg</div>
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Segmented Grid</div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 space-y-0">

          <div className="px-5 text-[10px] font-black text-siem-muted uppercase tracking-[0.15em] mb-1 mt-2">
            Monitoring
          </div>
          <NavLink to="/"            icon={LayoutDashboard} active={location.pathname === '/'}>Summary</NavLink>
          <NavLink to="/data-sources" icon={Database}        active={location.pathname === '/data-sources'}>Data Sources</NavLink>
          <NavLink to="/documentation" icon={HelpCircle}   active={location.pathname === '/documentation'}>Documentation</NavLink>

          <div className="px-5 text-[10px] font-black text-siem-muted uppercase tracking-[0.15em] mb-1 mt-5">
            Operations
          </div>
          <NavLink to="/timeline"      icon={Activity} active={location.pathname === '/timeline'}>Attack Timeline</NavLink>
          <NavLink to="/hunt"           icon={Search}   active={location.pathname === '/hunt'}>Threat Hunt</NavLink>
          <NavLink to="/alerts"         icon={List}     active={location.pathname === '/alerts'}>Alert Queue</NavLink>
          <NavLink to="/investigations" icon={Activity} active={location.pathname.startsWith('/investigations')}>Investigations</NavLink>
          <NavLink to="/assets"         icon={Database} active={location.pathname === '/assets'}>Assets</NavLink>
          <NavLink to="/agents"         icon={Monitor}  active={location.pathname === '/agents'}>Security Agents</NavLink>
          <div className="px-5 text-[10px] font-black text-siem-muted uppercase tracking-[0.15em] mb-1 mt-5">
            Configuration
          </div>
          <NavLink to="/rules"          icon={Code}     active={location.pathname.startsWith('/rules')}>Detection Rules</NavLink>
          <NavLink to="/simulator"      icon={Activity} active={location.pathname === '/simulator'}>Detection Lab</NavLink>

          <div className="px-5 text-[10px] font-black text-siem-muted uppercase tracking-[0.15em] mb-1 mt-5">
            Administration
          </div>
          <NavLink to="/users" icon={Users} active={location.pathname === '/users'}>
            User Management
          </NavLink>
          <NavLink to="/settings" icon={Settings} active={location.pathname === '/settings'}>
            Grid Settings
          </NavLink>
          <NavLink to="/documentation" icon={HelpCircle} active={location.pathname === '/documentation'}>
            Documentation
          </NavLink>
        </div>

        {/* Bottom user panel */}
        <div className="p-4 border-t border-siem-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs border border-blue-600/30">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-black text-white truncate uppercase tracking-tight">{user?.full_name}</div>
              <div className="text-[9px] font-bold text-siem-muted uppercase tracking-widest">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-siem-muted hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-siem-bg">

        {/* Top Header — breadcrumb + status only */}
        <header className="h-14 bg-siem-panel border-b border-siem-border flex items-center justify-between px-6 flex-shrink-0 z-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-siem-muted">
            <span className="text-siem-muted font-medium">AeriSeg</span>
            <ChevronRight className="w-3.5 h-3.5 text-siem-border" />
            <span className="text-siem-text font-bold">{currentPage}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="text-[10px] font-black text-siem-muted uppercase tracking-widest">Systems Operational</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <EventDrawer onPivot={handleGlobalPivot} />
    </div>
  )
}

function NavLink({ to, icon: Icon, children, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-[3px]
        ${active
          ? 'border-blue-600 text-white bg-blue-600/10 font-semibold'
          : 'border-transparent text-siem-muted hover:text-white hover:bg-siem-border/30'
        }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  )
}
