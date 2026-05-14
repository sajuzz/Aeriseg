import { create } from 'zustand';

export const useEventDrawerStore = create((set) => ({
  isOpen: false,
  selectedEvent: null,
  contextType: 'threat_hunt', // 'threat_hunt', 'investigation', 'correlation'
  contextId: null, // e.g. investigation_id
  
  openDrawer: (event, contextType = 'threat_hunt', contextId = null) => set({ 
    isOpen: true, 
    selectedEvent: event,
    contextType,
    contextId
  }),
  
  closeDrawer: () => set({ 
    isOpen: false, 
    selectedEvent: null,
    contextType: 'threat_hunt',
    contextId: null
  }),
}));
