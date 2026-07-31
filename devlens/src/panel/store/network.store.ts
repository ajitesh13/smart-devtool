import { create } from 'zustand'
import type { NetworkRequest } from '../../shared/types'

interface NetworkFilter {
  search: string
  protocols: Set<NetworkRequest['protocol']>
  statusMin?: number
  statusMax?: number
}

interface NetworkStore {
  requests: NetworkRequest[]
  selected: NetworkRequest | null
  filter: NetworkFilter
  isCapturing: boolean

  setRequests: (requests: NetworkRequest[]) => void
  addRequest: (request: NetworkRequest) => void
  updateRequest: (id: string, updates: Partial<NetworkRequest>) => void
  selectRequest: (request: NetworkRequest | null) => void
  setFilter: (filter: Partial<NetworkFilter>) => void
  clearRequests: () => void
  setCapturing: (capturing: boolean) => void
}

const DEFAULT_FILTER: NetworkFilter = {
  search: '',
  protocols: new Set(['XHR', 'Fetch', 'WS', 'SSE', 'Other']),
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  requests: [],
  selected: null,
  filter: DEFAULT_FILTER,
  isCapturing: false,

  setRequests: (requests) => set({ requests }),

  addRequest: (request) =>
    set((state) => ({ requests: [...state.requests, request] })),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      selected: state.selected?.id === id ? { ...state.selected, ...updates } : state.selected,
    })),

  selectRequest: (request) => set({ selected: request }),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  clearRequests: () => set({ requests: [], selected: null }),

  setCapturing: (isCapturing) => set({ isCapturing }),
}))

export const selectFilteredRequests = (state: NetworkStore): NetworkRequest[] => {
  const { requests, filter } = state
  return requests.filter((r) => {
    if (!filter.protocols.has(r.protocol)) return false
    if (filter.search) {
      const q = filter.search.toLowerCase()
      if (!r.url.toLowerCase().includes(q) && !r.method.toLowerCase().includes(q)) return false
    }
    if (filter.statusMin !== undefined && (r.status ?? 0) < filter.statusMin) return false
    if (filter.statusMax !== undefined && (r.status ?? 999) > filter.statusMax) return false
    return true
  })
}
