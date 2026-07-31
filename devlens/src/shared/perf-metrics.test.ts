import { describe, it, expect } from 'vitest'
import {
  metricsToSnapshot,
  cpuPercentBetween,
  countNodes,
  labelFor,
  aggregateSubtrees,
  type DomNodeLike,
} from './perf-metrics'

describe('metricsToSnapshot', () => {
  it('maps known CDP metric names into a typed snapshot', () => {
    const snap = metricsToSnapshot(
      [
        { name: 'JSHeapUsedSize', value: 1000 },
        { name: 'JSHeapTotalSize', value: 4000 },
        { name: 'Nodes', value: 512 },
        { name: 'JSEventListeners', value: 30 },
        { name: 'Documents', value: 2 },
        { name: 'Frames', value: 1 },
        { name: 'LayoutCount', value: 7 },
        { name: 'RecalcStyleCount', value: 9 },
        { name: 'ScriptDuration', value: 0.5 },
        { name: 'TaskDuration', value: 0.8 },
        { name: 'IgnoredUnknownMetric', value: 999 },
      ],
      12345
    )
    expect(snap).toEqual({
      timestamp: 12345,
      jsHeapUsed: 1000,
      jsHeapTotal: 4000,
      nodes: 512,
      jsEventListeners: 30,
      documents: 2,
      frames: 1,
      layoutCount: 7,
      recalcStyleCount: 9,
      scriptDuration: 0.5,
      taskDuration: 0.8,
    })
  })

  it('defaults missing metrics to 0', () => {
    const snap = metricsToSnapshot([], 1)
    expect(snap.nodes).toBe(0)
    expect(snap.jsHeapUsed).toBe(0)
  })
})

describe('cpuPercentBetween', () => {
  const base = metricsToSnapshot([], 0)

  it('computes busy fraction of wall-clock from TaskDuration delta', () => {
    const prev = { ...base, timestamp: 0, taskDuration: 1.0 }
    const curr = { ...base, timestamp: 1000, taskDuration: 1.5 } // 500ms busy / 1000ms wall
    expect(cpuPercentBetween(prev, curr)).toBe(50)
  })

  it('clamps to 100 and never returns negatives', () => {
    const prev = { ...base, timestamp: 0, taskDuration: 0 }
    const busy = { ...base, timestamp: 100, taskDuration: 5 } // way over
    expect(cpuPercentBetween(prev, busy)).toBe(100)

    const backwards = { ...base, timestamp: 100, taskDuration: 0 }
    const earlier = { ...base, timestamp: 0, taskDuration: 5 }
    expect(cpuPercentBetween(earlier, backwards)).toBe(0)
  })

  it('returns 0 when no time elapsed', () => {
    const p = { ...base, timestamp: 500, taskDuration: 1 }
    expect(cpuPercentBetween(p, p)).toBe(0)
  })
})

describe('countNodes', () => {
  it('counts node + all descendants', () => {
    const tree: DomNodeLike = {
      nodeName: 'DIV',
      children: [
        { nodeName: 'SPAN' },
        { nodeName: 'UL', children: [{ nodeName: 'LI' }, { nodeName: 'LI' }] },
      ],
    }
    expect(countNodes(tree)).toBe(5)
  })
})

describe('labelFor', () => {
  it('prefers id, then data-*, then class, then tag', () => {
    expect(labelFor({ nodeName: 'DIV', attributes: ['id', 'root'] })).toBe('div#root')
    expect(labelFor({ nodeName: 'DIV', attributes: ['data-app', 'x'] })).toBe('div[data-app]')
    expect(labelFor({ nodeName: 'SECTION', attributes: ['class', 'hero big'] })).toBe('section.hero')
    expect(labelFor({ nodeName: 'MAIN' })).toBe('main')
  })
})

describe('aggregateSubtrees', () => {
  it('attributes node counts to body top-level children, sorted desc', () => {
    const doc: DomNodeLike = {
      nodeName: '#document',
      children: [
        {
          nodeName: 'HTML',
          children: [
            { nodeName: 'HEAD' },
            {
              nodeName: 'BODY',
              children: [
                { nodeName: 'HEADER', attributes: ['id', 'top'] },
                {
                  nodeName: 'DIV',
                  attributes: ['id', 'app'],
                  children: [{ nodeName: 'SPAN' }, { nodeName: 'SPAN' }],
                },
                { nodeName: '#text' }, // ignored
              ],
            },
          ],
        },
      ],
    }
    const result = aggregateSubtrees(doc)
    expect(result).toEqual([
      { label: 'div#app', nodeCount: 3 },
      { label: 'header#top', nodeCount: 1 },
    ])
  })

  it('returns empty when no body found', () => {
    expect(aggregateSubtrees({ nodeName: 'DIV' })).toEqual([])
  })
})
