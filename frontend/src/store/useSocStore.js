import { create } from 'zustand'

export const useSocStore = create((set) => ({
  alerts: [],
  telemetry: [],
  campaigns: [],
  wsConnected: false,
  
  setWsStatus: (status) => set({ wsConnected: status }),
  
  addAlert: (alert) => set((state) => ({ 
    alerts: [alert, ...state.alerts].slice(0, 50) 
  })),
  
  addTelemetry: (event) => set((state) => ({
    telemetry: [event, ...state.telemetry].slice(0, 100)
  })),

  setCampaigns: (campaigns) => set({ campaigns }),
  addCampaign: (campaign) => set((state) => ({
    campaigns: [campaign, ...state.campaigns]
  })),
  updateCampaign: (update) => set((state) => ({
    campaigns: state.campaigns.map(c => c.id === update.id ? { ...c, ...update } : c)
  }))
}))
