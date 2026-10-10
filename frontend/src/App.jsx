import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom'
import { Shield, Activity, List, BarChart2 } from 'lucide-react'
import { useSocStore } from './store/useSocStore'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import ThreatHunt from './pages/ThreatHunt'
import InvestigationQueue from './pages/InvestigationQueue'
import InvestigationDetail from './pages/InvestigationDetail'
import Alerts from './pages/Alerts'
import Assets from './pages/Assets'
import CustomDashboards from './pages/CustomDashboards'
import Rules from './pages/Rules'
import RuleBuilder from './pages/RuleBuilder'
import AttackSimulator from './pages/AttackSimulator'
import Settings from './pages/Settings'
import AnalystWorkbench from './pages/AnalystWorkbench'
import Agents from './pages/Agents'
import UserManagement from './pages/Users'
import Documentation from './pages/Documentation'
import Login from './pages/Login'
import DataSources from './pages/DataSources'
import AttackTimeline from './pages/AttackTimeline'
import PlaybookDesigner from './pages/PlaybookDesigner'
import IndustrialIntelligence from './pages/IndustrialIntelligence'

import SidebarLayout from './layouts/SidebarLayout'
import { useAuthStore } from './stores/useAuthStore'








function App() {
  const { setWsStatus, addAlert, addTelemetry, addCampaign, updateCampaign } = useSocStore()
  const { user, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // Dynamically connect to the backend running on port 8000
    const host = window.location.hostname
    const ws = new WebSocket(`ws://${host}:8000/ws/telemetry`)
    
    ws.onopen = () => {
      console.log('WS Connected')
      setWsStatus(true)
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'alert') {
        addAlert(data)
      } else if (data.type === 'telemetry') {
        addTelemetry(data.data)
      } else if (data.type === 'campaign_created') {
        addCampaign(data.data)
      } else if (data.type === 'campaign_updated') {
        updateCampaign(data.data)
      }
    }
    
    ws.onclose = () => {
      console.log('WS Disconnected')
      setWsStatus(false)
    }
    
    return () => ws.close()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={user ? <SidebarLayout><Outlet /></SidebarLayout> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/dashboards" element={<CustomDashboards />} />
          <Route path="/hunt" element={<ThreatHunt />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/workbench/:id" element={<AnalystWorkbench />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/rules/new" element={<RuleBuilder />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/simulator" element={<AttackSimulator />} />
          <Route path="/investigations" element={<InvestigationQueue />} />
          <Route path="/investigations/:id" element={<InvestigationDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/timeline" element={<AttackTimeline />} />
          <Route path="/playbooks/designer" element={<PlaybookDesigner />} />
          <Route path="/industrial" element={<IndustrialIntelligence />} />
          <Route path="/industrial-intelligence" element={<IndustrialIntelligence />} />
        </Route>
      </Routes>
    </Router>
  )
}


export default App
