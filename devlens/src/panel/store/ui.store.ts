import { create } from 'zustand'
import type { TabId } from '../components/layout/TabBar'

interface UIStore {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'network',
  setActiveTab: (activeTab) => set({ activeTab }),
}))
