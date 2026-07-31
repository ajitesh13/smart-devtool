import { create } from 'zustand'
import type { ConsoleEntry } from '../../shared/types'

export type LinkFilter = 'all' | 'linked' | 'unlinked'

interface ConsoleFilter {
  levels: Set<ConsoleEntry['level']>
  search: string
  useRegex: boolean
  linkFilter: LinkFilter
  sourceSearch: string
}

interface ConsoleStore {
  entries: ConsoleEntry[]
  filter: ConsoleFilter

  setEntries: (entries: ConsoleEntry[]) => void
  addEntry: (entry: ConsoleEntry) => void
  clearEntries: () => void
  setFilter: (filter: Partial<ConsoleFilter>) => void
  toggleLevel: (level: ConsoleEntry['level']) => void
}

const ALL_LEVELS = new Set<ConsoleEntry['level']>(['log', 'warn', 'error', 'info', 'debug'])

const DEFAULT_FILTER: ConsoleFilter = {
  levels: new Set(ALL_LEVELS),
  search: '',
  useRegex: false,
  linkFilter: 'all',
  sourceSearch: '',
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
  entries: [],
  filter: DEFAULT_FILTER,

  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  clearEntries: () => set({ entries: [] }),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  toggleLevel: (level) =>
    set((state) => {
      const levels = new Set(state.filter.levels)
      if (levels.has(level)) levels.delete(level)
      else levels.add(level)
      return { filter: { ...state.filter, levels } }
    }),
}))

const regexCache = new Map<string, RegExp | null>()
function compile(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern)!
  let re: RegExp | null = null
  try {
    re = new RegExp(pattern, 'i')
  } catch {
    re = null
  }
  regexCache.set(pattern, re)
  return re
}

export function selectFilteredEntries(state: ConsoleStore): ConsoleEntry[] {
  const { entries, filter } = state

  return entries.filter((e) => {
    if (!filter.levels.has(e.level)) return false

    if (filter.linkFilter === 'linked' && !e.relatedRequestId) return false
    if (filter.linkFilter === 'unlinked' && e.relatedRequestId) return false

    if (filter.search) {
      if (filter.useRegex) {
        const re = compile(filter.search)
        if (!re || !re.test(e.message)) return false
      } else if (!e.message.toLowerCase().includes(filter.search.toLowerCase())) {
        return false
      }
    }

    if (filter.sourceSearch) {
      const src = e.source ?? ''
      if (!src.toLowerCase().includes(filter.sourceSearch.toLowerCase())) return false
    }

    return true
  })
}

export function countByLevel(entries: ConsoleEntry[]): Record<ConsoleEntry['level'], number> {
  const counts = { log: 0, warn: 0, error: 0, info: 0, debug: 0 }
  for (const e of entries) counts[e.level]++
  return counts
}
