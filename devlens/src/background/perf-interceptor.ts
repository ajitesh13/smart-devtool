import type { PerfSnapshot, DomSubtree, DetachedNode } from '../shared/types'
import {
  metricsToSnapshot,
  aggregateSubtrees,
  countNodes,
  labelFor,
  type CdpMetric,
  type DomNodeLike,
} from '../shared/perf-metrics'

const POLL_INTERVAL_MS = 1000
const MAX_SNAPSHOTS = 120 // ~2 min of history at 1 Hz

/**
 * Polls CDP `Performance.getMetrics` for live vitals (heap / CPU / DOM nodes),
 * and provides on-demand DOM provenance + detached-node leak scanning.
 * Mirrors the NetworkInterceptor/ConsoleInterceptor class shape.
 */
export class PerfInterceptor {
  private tabId: number
  private snapshots: PerfSnapshot[] = []
  private provenance: DomSubtree[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private domEnabled = false

  constructor(tabId: number) {
    this.tabId = tabId
  }

  async enable(): Promise<void> {
    await this.send('Performance.enable', {})
    this.timer = setInterval(() => {
      this.poll().catch(() => undefined)
    }, POLL_INTERVAL_MS)
    // Prime one sample immediately so the panel isn't empty on open.
    this.poll().catch(() => undefined)
  }

  getSnapshots(): PerfSnapshot[] {
    return this.snapshots
  }

  getLatest(): PerfSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1]
  }

  getProvenance(): DomSubtree[] {
    return this.provenance
  }

  clear(): void {
    this.snapshots = []
    this.provenance = []
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    const res = (await this.send('Performance.getMetrics', {})) as { metrics?: CdpMetric[] }
    const snap = metricsToSnapshot(res.metrics ?? [], Date.now())
    this.snapshots.push(snap)
    if (this.snapshots.length > MAX_SNAPSHOTS) this.snapshots.shift()
  }

  /** Live subtree attribution: which top-level container holds most nodes. */
  async computeProvenance(): Promise<DomSubtree[]> {
    await this.ensureDom()
    const res = (await this.send('DOM.getDocument', { depth: -1, pierce: false })) as {
      root: DomNodeLike
    }
    this.provenance = aggregateSubtrees(res.root)
    return this.provenance
  }

  /**
   * On-demand detached-node leak scan via the (experimental) CDP command
   * `DOM.getDetachedDomNodes`. Grouped by container label. Throws a friendly
   * error if the running Chrome doesn't expose the command.
   */
  async scanDetached(): Promise<DetachedNode[]> {
    await this.ensureDom()
    let res: { detachedNodes?: Array<{ treeNode: DomNodeLike; retainedNodeIds?: number[] }> }
    try {
      res = (await this.send('DOM.getDetachedDomNodes', {})) as typeof res
    } catch (e) {
      throw new Error(`Detached-node scan unavailable in this Chrome build (${String(e)})`)
    }

    const byLabel = new Map<string, { count: number; nodes: number }>()
    for (const dn of res.detachedNodes ?? []) {
      const label = labelFor(dn.treeNode)
      const nodes = countNodes(dn.treeNode)
      const cur = byLabel.get(label) ?? { count: 0, nodes: 0 }
      cur.count += 1
      cur.nodes += nodes
      byLabel.set(label, cur)
    }

    const out: DetachedNode[] = Array.from(byLabel.entries()).map(([description, v]) => ({
      description,
      count: v.count,
      retainedSize: v.nodes,
    }))
    out.sort((a, b) => (b.retainedSize ?? 0) - (a.retainedSize ?? 0))
    return out
  }

  private async ensureDom(): Promise<void> {
    if (this.domEnabled) return
    await this.send('DOM.enable', {})
    this.domEnabled = true
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    return chrome.debugger.sendCommand({ tabId: this.tabId }, method, params)
  }
}
