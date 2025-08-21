import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isExpanded: boolean
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isExpanded: false, // Por defecto contraído
      toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
      setSidebarExpanded: (expanded: boolean) => set({ isExpanded: expanded }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)
