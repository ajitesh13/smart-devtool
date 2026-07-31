import { describe, it, expect } from 'vitest'
import { buildEvents, timelineWindow, layoutTimeline } from './timeline'
import type { NetworkRequest, ConsoleEntry, PerfSnapshot } from './types'

const req = (id: string, start: number, status?: number, error?: string): NetworkRequest => ({
  id,
  url: `https://api.test/${id}`,
  method: 'GET',
  protocol: 'Fetch',
  status,
  error,
  requestHeaders: {},
  responseHeaders: {},
  timing: { start },
})

const con = (id: string, ts: number, level: ConsoleEntry['level']): ConsoleEntry => ({
  id,
  level,
  message: `msg ${id}`,
  timestamp: ts,
})

const snap = (ts: number, heap: number): PerfSnapshot => ({
  timestamp: ts,
  jsHeapUsed: heap,
  jsHeapTotal: heap * 2,
  nodes: 100,
  jsEventListeners: 10,
  documents: 1,
  frames: 1,
  layoutCount: 0,
  recalcStyleCount: 0,
  scriptDuration: 0,
  taskDuration: 0,
})

describe('buildEvents', () => {
  it('maps network status to severity', () => {
    const e = buildEvents([req('a', 1, 200), req('b', 2, 404), req('c', 3, 500)], [], [])
    expect(e.find((x) => x.refId === 'a')!.severity).toBe('ok')
    expect(e.find((x) => x.refId === 'b')!.severity).toBe('warn')
    expect(e.find((x) => x.refId === 'c')!.severity).toBe('error')
  })

  it('treats network error as error severity regardless of status', () => {
    const e = buildEvents([req('x', 1, undefined, 'net::ERR')], [], [])
    expect(e[0].severity).toBe('error')
  })

  it('maps console levels', () => {
    const e = buildEvents([], [con('l', 1, 'log'), con('w', 2, 'warn'), con('e', 3, 'error')], [])
    expect(e.find((x) => x.refId === 'l')!.severity).toBe('info')
    expect(e.find((x) => x.refId === 'w')!.severity).toBe('warn')
    expect(e.find((x) => x.refId === 'e')!.severity).toBe('error')
  })

  it('only surfaces perf snapshots above the heap threshold', () => {
    const perf = [snap(1, 10), snap(2, 20), snap(3, 100)]
    const e = buildEvents([], [], perf, 50)
    const perfEvents = e.filter((x) => x.kind === 'perf')
    expect(perfEvents).toHaveLength(1)
    expect(perfEvents[0].refId).toBe('3')
  })
})

describe('timelineWindow', () => {
  it('returns [0,1] for empty', () => {
    expect(timelineWindow([])).toEqual({ start: 0, end: 1 })
  })

  it('spans min..max with padding', () => {
    const e = buildEvents([req('a', 100, 200), req('b', 200, 200)], [], [])
    const w = timelineWindow(e)
    expect(w.start).toBeLessThan(100)
    expect(w.end).toBeGreaterThan(200)
  })
})

describe('layoutTimeline', () => {
  it('assigns offsets 0..1 sorted by time', () => {
    const e = buildEvents([req('b', 200, 200), req('a', 100, 200)], [], [])
    const w = timelineWindow(e)
    const laid = layoutTimeline(e, w)
    expect(laid[0].refId).toBe('a')
    expect(laid[1].refId).toBe('b')
    for (const ev of laid) {
      expect(ev.offset).toBeGreaterThanOrEqual(0)
      expect(ev.offset).toBeLessThanOrEqual(1)
    }
  })
})
