import { create } from 'zustand'
import type { MockRule } from '../../shared/types'

interface MocksStore {
  rules: MockRule[]
  loaded: boolean
  setRules: (rules: MockRule[]) => void
  upsert: (rule: MockRule) => void
  remove: (id: string) => void
  toggle: (id: string) => void
}

export const useMocksStore = create<MocksStore>((set) => ({
  rules: [],
  loaded: false,
  setRules: (rules) => set({ rules, loaded: true }),
  upsert: (rule) =>
    set((s) => {
      const idx = s.rules.findIndex((r) => r.id === rule.id)
      const rules = idx >= 0 ? s.rules.map((r) => (r.id === rule.id ? rule : r)) : [...s.rules, rule]
      return { rules }
    }),
  remove: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
  toggle: (id) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),
}))

/** Deterministic id without Math.random / Date.now dependency at module scope. */
export function newRuleId(existing: MockRule[]): string {
  let n = existing.length + 1
  const ids = new Set(existing.map((r) => r.id))
  while (ids.has(`rule-${n}`)) n++
  return `rule-${n}`
}
