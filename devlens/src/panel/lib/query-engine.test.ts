import { describe, it, expect } from 'vitest'
import {
  evaluateFilterSet,
  sortRequests,
  groupRequests,
  runQuery,
  type FilterSet,
} from './query-engine'
import type { NetworkRequest } from '../../shared/types'

function makeReq(over: Partial<NetworkRequest>): NetworkRequest {
  return {
    id: over.id ?? Math.random().toString(36),
    url: over.url ?? 'https://api.example.com/v1/users',
    method: over.method ?? 'GET',
    protocol: over.protocol ?? 'XHR',
    status: over.status,
    requestHeaders: over.requestHeaders ?? {},
    responseHeaders: over.responseHeaders ?? {},
    requestBody: over.requestBody,
    responseBody: over.responseBody,
    timing: over.timing ?? { start: 0, duration: 100 },
    error: over.error,
  }
}

const reqs: NetworkRequest[] = [
  makeReq({ id: '1', url: 'https://api.example.com/v1/users', status: 200, protocol: 'XHR', timing: { start: 0, duration: 50 } }),
  makeReq({ id: '2', url: 'https://api.example.com/v2/orders', status: 404, protocol: 'Fetch', timing: { start: 0, duration: 200 } }),
  makeReq({ id: '3', url: 'wss://api.example.com/socket', status: 101, protocol: 'WS', timing: { start: 0, duration: 10 } }),
  makeReq({ id: '4', url: 'https://cdn.other.com/img.png', status: 500, protocol: 'Fetch', timing: { start: 0, duration: 300 } }),
]

describe('evaluateFilterSet', () => {
  it('returns all when no rules', () => {
    const fs: FilterSet = { id: 'a', name: 'x', rules: [], combinator: 'AND' }
    expect(evaluateFilterSet(reqs, fs)).toHaveLength(4)
  })

  it('regex on url', () => {
    const fs: FilterSet = {
      id: 'a', name: 'x', combinator: 'AND',
      rules: [{ field: 'url', op: 'regex', value: '/v\\d+/' }],
    }
    const out = evaluateFilterSet(reqs, fs)
    expect(out.map((r) => r.id)).toEqual(['1', '2'])
  })

  it('status range', () => {
    const fs: FilterSet = {
      id: 'a', name: 'x', combinator: 'AND',
      rules: [{ field: 'status', op: 'range', value: '400-599' }],
    }
    expect(evaluateFilterSet(reqs, fs).map((r) => r.id)).toEqual(['2', '4'])
  })

  it('negate', () => {
    const fs: FilterSet = {
      id: 'a', name: 'x', combinator: 'AND',
      rules: [{ field: 'protocol', op: 'eq', value: 'WS', negate: true }],
    }
    expect(evaluateFilterSet(reqs, fs).map((r) => r.id)).toEqual(['1', '2', '4'])
  })

  it('OR combinator', () => {
    const fs: FilterSet = {
      id: 'a', name: 'x', combinator: 'OR',
      rules: [
        { field: 'protocol', op: 'eq', value: 'WS' },
        { field: 'status', op: 'eq', value: '200' },
      ],
    }
    expect(evaluateFilterSet(reqs, fs).map((r) => r.id).sort()).toEqual(['1', '3'])
  })

  it('bad regex matches nothing, does not throw', () => {
    const fs: FilterSet = {
      id: 'a', name: 'x', combinator: 'AND',
      rules: [{ field: 'url', op: 'regex', value: '[invalid(' }],
    }
    expect(evaluateFilterSet(reqs, fs)).toHaveLength(0)
  })
})

describe('sortRequests', () => {
  it('multi-key: status asc then duration desc', () => {
    const out = sortRequests(reqs, [
      { field: 'status', dir: 'asc' },
      { field: 'duration', dir: 'desc' },
    ])
    expect(out.map((r) => r.status)).toEqual([101, 200, 404, 500])
  })

  it('duration desc', () => {
    const out = sortRequests(reqs, [{ field: 'duration', dir: 'desc' }])
    expect(out.map((r) => r.id)).toEqual(['4', '2', '1', '3'])
  })
})

describe('groupRequests', () => {
  it('group by domain', () => {
    const groups = groupRequests(reqs, { by: 'domain' })
    const keys = groups.map((g) => g.key).sort()
    expect(keys).toEqual(['api.example.com', 'cdn.other.com'])
  })

  it('group by status-class with stats', () => {
    const groups = groupRequests(reqs, { by: 'status-class' })
    const g5xx = groups.find((g) => g.key === '5xx')!
    expect(g5xx.stats.count).toBe(1)
    expect(g5xx.stats.errorCount).toBe(1)
  })

  it('regex-capture named group', () => {
    const groups = groupRequests(reqs, {
      by: 'regex-capture',
      capturePattern: '/(?<ver>v\\d+)/',
    })
    const keys = groups.map((g) => g.key)
    expect(keys).toContain('v1')
    expect(keys).toContain('v2')
  })
})

describe('runQuery pipeline', () => {
  it('filter + sort + group together', () => {
    const groups = runQuery(reqs, {
      filterSet: { id: 'a', name: 'x', combinator: 'AND', rules: [{ field: 'protocol', op: 'eq', value: 'Fetch' }] },
      sort: [{ field: 'duration', dir: 'desc' }],
      group: { by: 'status-class' },
    })
    // Only Fetch reqs (2,4), grouped 4xx + 5xx
    expect(groups.map((g) => g.key).sort()).toEqual(['4xx', '5xx'])
  })
})
