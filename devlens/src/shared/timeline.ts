import type { NetworkRequest, ConsoleEntry, PerfSnapshot } from './types'

export type TimelineKind = 'network' | 'console' | 'perf'

export interface TimelineEvent {
  id: string
  kind: TimelineKind
  timestamp: number
  /** 0..1 position across the visible window; filled by layoutTimeline. */
  offset: number
  label: string
  /** Severity for coloring: 'error' | 'warn' | 'ok' | 'info'. */
  severity: 'error' | 'warn' | 'ok' | 'info'
  /** Cross-filter key: the underlying entity id (request id / console id). */
  refId: string
}

export interface TimelineWindow {
  start: number
  end: number
}

function reqSeverity(r: NetworkRequest): TimelineEvent['severity'] {
  if (r.error) return 'error'
  if (r.status == null) return 'info'
  if (r.status >= 500) return 'error'
  if (r.status >= 400) return 'warn'
  return 'ok'
}

function conSeverity(level: ConsoleEntry['level']): TimelineEvent['severity'] {
  if (level === 'error') return 'error'
  if (level === 'warn') return 'warn'
  return 'info'
}

/** Build the unbounded, unsorted event list from the three sources. Pure. */
export function buildEvents(
  requests: NetworkRequest[],
  console: ConsoleEntry[],
  perf: PerfSnapshot[],
  perfHeapThreshold?: number
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const r of requests) {
    events.push({
      id: `n:${r.id}`,
      kind: 'network',
      timestamp: r.timing.start,
      offset: 0,
      label: `${r.method} ${shortUrl(r.url)}${r.status ? ` · ${r.status}` : ''}`,
      severity: reqSeverity(r),
      refId: r.id,
    })
  }

  for (const c of console) {
    events.push({
      id: `c:${c.id}`,
      kind: 'console',
      timestamp: c.timestamp,
      offset: 0,
      label: `${c.level}: ${c.message.slice(0, 80)}`,
      severity: conSeverity(c.level),
      refId: c.id,
    })
  }

  // Perf: only surface snapshots that cross a heap threshold, so the lane isn't
  // a wall of 1 Hz dots. Default: flag local heap maxima above the 90th pctile.
  if (perf.length) {
    const threshold = perfHeapThreshold ?? percentile(perf.map((p) => p.jsHeapUsed), 0.9)
    for (const p of perf) {
      if (p.jsHeapUsed >= threshold) {
        events.push({
          id: `p:${p.timestamp}`,
          kind: 'perf',
          timestamp: p.timestamp,
          offset: 0,
          label: `heap ${(p.jsHeapUsed / 1e6).toFixed(1)}MB · ${p.nodes} nodes`,
          severity: 'warn',
          refId: String(p.timestamp),
        })
      }
    }
  }

  return events
}

/** Compute the [start,end] window spanning all events (with 2% padding). Pure. */
export function timelineWindow(events: TimelineEvent[]): TimelineWindow {
  if (events.length === 0) return { start: 0, end: 1 }
  let start = Infinity
  let end = -Infinity
  for (const e of events) {
    if (e.timestamp < start) start = e.timestamp
    if (e.timestamp > end) end = e.timestamp
  }
  if (start === end) end = start + 1
  const pad = (end - start) * 0.02
  return { start: start - pad, end: end + pad }
}

/** Assign each event a 0..1 offset within the window; returns sorted copy. Pure. */
export function layoutTimeline(events: TimelineEvent[], win: TimelineWindow): TimelineEvent[] {
  const span = win.end - win.start || 1
  return [...events]
    .map((e) => ({ ...e, offset: clamp01((e.timestamp - win.start) / span) }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx]
}

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url.slice(0, 40)
  }
}
