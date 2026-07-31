import { create } from 'zustand'
import type { PerfSnapshot, DomSubtree, DetachedNode } from '../../shared/types'

interface PerfStore {
  snapshots: PerfSnapshot[]
  provenance: DomSubtree[]
  detached: DetachedNode[]
  isScanning: boolean
  scanError: string | null

  setSnapshots: (snapshots: PerfSnapshot[]) => void
  setProvenance: (provenance: DomSubtree[]) => void
  setDetached: (detached: DetachedNode[]) => void
  setScanning: (isScanning: boolean) => void
  setScanError: (scanError: string | null) => void
  clear: () => void
}

export const usePerfStore = create<PerfStore>((set) => ({
  snapshots: [],
  provenance: [],
  detached: [],
  isScanning: false,
  scanError: null,

  setSnapshots: (snapshots) => set({ snapshots }),
  setProvenance: (provenance) => set({ provenance }),
  setDetached: (detached) => set({ detached }),
  setScanning: (isScanning) => set({ isScanning }),
  setScanError: (scanError) => set({ scanError }),
  clear: () => set({ snapshots: [], provenance: [], detached: [], scanError: null }),
}))

export const selectLatest = (s: PerfStore): PerfSnapshot | undefined =>
  s.snapshots[s.snapshots.length - 1]
