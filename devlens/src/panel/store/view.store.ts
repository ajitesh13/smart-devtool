import { create } from 'zustand'
import type { NetworkRequest } from '../../shared/types'
import type { FilterSet, GroupConfig, SortKey, QueryConfig } from '../lib/query-engine'

export type ViewMode = 'single' | 'split'

export interface Pane {
  id: string
  title: string
  protocol: NetworkRequest['protocol'] | 'ALL'
  filterSet: FilterSet
  sort: SortKey[]
  group: GroupConfig
}

function emptyFilterSet(id: string): FilterSet {
  return { id, name: 'default', rules: [], combinator: 'AND' }
}

function makePane(protocol: Pane['protocol'], title: string): Pane {
  return {
    id: `pane-${protocol}`,
    title,
    protocol,
    filterSet: emptyFilterSet(`fs-${protocol}`),
    sort: [{ field: 'start', dir: 'asc' }],
    group: { by: 'none' },
  }
}

// Preset protocol panes — the "see types together" USP
const PROTOCOL_PANES: Pane[] = [
  makePane('XHR', 'XHR'),
  makePane('Fetch', 'Fetch'),
  makePane('WS', 'WebSocket'),
  makePane('SSE', 'SSE'),
]

interface ViewStore {
  mode: ViewMode
  singlePane: Pane
  panes: Pane[] // active split panes
  savedFilters: FilterSet[]

  setMode: (mode: ViewMode) => void
  togglePaneProtocol: (protocol: NetworkRequest['protocol']) => void
  updatePane: (id: string, updates: Partial<Pane>) => void
  updatePaneQuery: (id: string, query: Partial<QueryConfig>) => void
  saveFilter: (filterSet: FilterSet) => void
  deleteFilter: (id: string) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  mode: 'single',
  singlePane: makePane('ALL', 'All Requests'),
  panes: [PROTOCOL_PANES[0], PROTOCOL_PANES[2]], // XHR + WS by default in split
  savedFilters: [],

  setMode: (mode) => set({ mode }),

  togglePaneProtocol: (protocol) =>
    set((state) => {
      const exists = state.panes.some((p) => p.protocol === protocol)
      if (exists) {
        return { panes: state.panes.filter((p) => p.protocol !== protocol) }
      }
      const preset = PROTOCOL_PANES.find((p) => p.protocol === protocol)
      return preset ? { panes: [...state.panes, preset] } : {}
    }),

  updatePane: (id, updates) =>
    set((state) => ({
      singlePane: state.singlePane.id === id ? { ...state.singlePane, ...updates } : state.singlePane,
      panes: state.panes.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  updatePaneQuery: (id, query) =>
    set((state) => {
      const apply = (p: Pane): Pane => ({
        ...p,
        filterSet: query.filterSet ?? p.filterSet,
        sort: query.sort ?? p.sort,
        group: query.group ?? p.group,
      })
      return {
        singlePane: state.singlePane.id === id ? apply(state.singlePane) : state.singlePane,
        panes: state.panes.map((p) => (p.id === id ? apply(p) : p)),
      }
    }),

  saveFilter: (filterSet) =>
    set((state) => ({
      savedFilters: [...state.savedFilters.filter((f) => f.id !== filterSet.id), filterSet],
    })),

  deleteFilter: (id) =>
    set((state) => ({ savedFilters: state.savedFilters.filter((f) => f.id !== id) })),
}))

export const ALL_PROTOCOLS: NetworkRequest['protocol'][] = ['XHR', 'Fetch', 'WS', 'SSE', 'Other']

// Protocol is a hard pane constraint applied BEFORE the user's filterSet,
// so the user's AND/OR semantics inside the pane stay intact.
export function paneProtocolFilter(pane: Pane, requests: NetworkRequest[]): NetworkRequest[] {
  if (pane.protocol === 'ALL') return requests
  return requests.filter((r) => r.protocol === pane.protocol)
}

export function paneQueryConfig(pane: Pane): QueryConfig {
  return { filterSet: pane.filterSet, sort: pane.sort, group: pane.group }
}
