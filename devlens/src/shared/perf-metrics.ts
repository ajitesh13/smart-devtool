import type { PerfSnapshot, DomSubtree } from './types'

/** A single {name, value} pair as returned by CDP `Performance.getMetrics`. */
export interface CdpMetric {
  name: string
  value: number
}

/**
 * Map the raw `Performance.getMetrics` array into a typed PerfSnapshot.
 * Pure — no CDP/chrome dependency, so it is unit-testable directly.
 */
export function metricsToSnapshot(metrics: CdpMetric[], timestamp: number): PerfSnapshot {
  const m = new Map<string, number>()
  for (const { name, value } of metrics) m.set(name, value)
  const get = (k: string): number => m.get(k) ?? 0

  return {
    timestamp,
    jsHeapUsed: get('JSHeapUsedSize'),
    jsHeapTotal: get('JSHeapTotalSize'),
    nodes: get('Nodes'),
    jsEventListeners: get('JSEventListeners'),
    documents: get('Documents'),
    frames: get('Frames'),
    layoutCount: get('LayoutCount'),
    recalcStyleCount: get('RecalcStyleCount'),
    scriptDuration: get('ScriptDuration'),
    taskDuration: get('TaskDuration'),
  }
}

/**
 * Derive a CPU-busy percentage between two snapshots.
 * TaskDuration is a cumulative seconds counter of main-thread work; the fraction
 * of wall-clock time spent in tasks between two samples ≈ CPU load.
 * Returns 0..100, clamped. Pure.
 */
export function cpuPercentBetween(prev: PerfSnapshot, curr: PerfSnapshot): number {
  const wallMs = curr.timestamp - prev.timestamp
  if (wallMs <= 0) return 0
  const busyMs = (curr.taskDuration - prev.taskDuration) * 1000
  const pct = (busyMs / wallMs) * 100
  if (!Number.isFinite(pct) || pct < 0) return 0
  return Math.min(100, Math.round(pct))
}

/** Minimal shape of a CDP `DOM.Node` (only the fields the aggregator needs). */
export interface DomNodeLike {
  nodeName: string
  nodeId?: number
  attributes?: string[] // flat [name, value, name, value, ...]
  children?: DomNodeLike[]
  childNodeCount?: number
}

/** Total node count for a subtree (the node itself + all descendants present). */
export function countNodes(node: DomNodeLike): number {
  let n = 1
  if (node.children) for (const c of node.children) n += countNodes(c)
  return n
}

/** Read an attribute value out of the flat CDP attributes array. */
function attr(node: DomNodeLike, name: string): string | undefined {
  const a = node.attributes
  if (!a) return undefined
  for (let i = 0; i + 1 < a.length; i += 2) {
    if (a[i] === name) return a[i + 1]
  }
  return undefined
}

/** Human label for a top-level container: prefer #id, then [data-*], then tag. */
export function labelFor(node: DomNodeLike): string {
  const tag = node.nodeName.toLowerCase()
  const id = attr(node, 'id')
  if (id) return `${tag}#${id}`
  if (node.attributes) {
    for (let i = 0; i + 1 < node.attributes.length; i += 2) {
      const name = node.attributes[i]
      if (name.startsWith('data-')) return `${tag}[${name}]`
    }
  }
  const cls = attr(node, 'class')
  if (cls) return `${tag}.${cls.split(/\s+/)[0]}`
  return tag
}

/**
 * Attribute DOM node counts to each top-level child of <body> (provenance):
 * "which subtree holds most of the nodes / is growing". Pure.
 * Walks document → <html> → <body> → its element children.
 */
export function aggregateSubtrees(documentRoot: DomNodeLike): DomSubtree[] {
  const body = findBody(documentRoot)
  if (!body?.children) return []
  const out: DomSubtree[] = body.children
    .filter((c) => c.nodeName !== '#text' && c.nodeName !== '#comment')
    .map((c) => ({ label: labelFor(c), nodeCount: countNodes(c) }))
  out.sort((a, b) => b.nodeCount - a.nodeCount)
  return out
}

function findBody(node: DomNodeLike): DomNodeLike | undefined {
  if (node.nodeName.toUpperCase() === 'BODY') return node
  if (node.children) {
    for (const c of node.children) {
      const found = findBody(c)
      if (found) return found
    }
  }
  return undefined
}
