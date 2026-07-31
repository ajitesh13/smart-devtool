import type { NetworkRequest } from '../../shared/types'

// ── Filter rules ──────────────────────────────────────────────

export type FilterField =
  | 'url'
  | 'method'
  | 'status'
  | 'protocol'
  | 'reqHeader'
  | 'resHeader'
  | 'reqBody'
  | 'resBody'
  | 'duration'

export type FilterOp = 'regex' | 'eq' | 'contains' | 'gt' | 'lt' | 'range'

export interface FilterRule {
  field: FilterField
  op: FilterOp
  value: string
  negate?: boolean
}

export interface FilterSet {
  id: string
  name: string
  rules: FilterRule[]
  combinator: 'AND' | 'OR'
}

// ── Grouping ──────────────────────────────────────────────────

export type GroupBy =
  | 'none'
  | 'domain'
  | 'endpoint'
  | 'status-class'
  | 'protocol'
  | 'method'
  | 'regex-capture'

export interface GroupConfig {
  by: GroupBy
  capturePattern?: string
}

export interface RequestGroup {
  key: string
  requests: NetworkRequest[]
  stats: { count: number; avgDuration: number; totalSize: number; errorCount: number }
}

// ── Sorting ───────────────────────────────────────────────────

export type SortField = 'url' | 'method' | 'status' | 'protocol' | 'duration' | 'start'
export interface SortKey {
  field: SortField
  dir: 'asc' | 'desc'
}

// ── Regex cache ───────────────────────────────────────────────

const regexCache = new Map<string, RegExp | null>()

function compileRegex(pattern: string): RegExp | null {
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

// ── Field extraction ──────────────────────────────────────────

function fieldValue(req: NetworkRequest, field: FilterField): string {
  switch (field) {
    case 'url':
      return req.url
    case 'method':
      return req.method
    case 'status':
      return String(req.status ?? '')
    case 'protocol':
      return req.protocol
    case 'reqHeader':
      return serializeHeaders(req.requestHeaders)
    case 'resHeader':
      return serializeHeaders(req.responseHeaders)
    case 'reqBody':
      return req.requestBody ?? ''
    case 'resBody':
      return req.responseBody ?? ''
    case 'duration':
      return String(req.timing.duration ?? '')
  }
}

function serializeHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

// ── Rule evaluation ───────────────────────────────────────────

function evaluateRule(req: NetworkRequest, rule: FilterRule): boolean {
  const raw = fieldValue(req, rule.field)
  let result: boolean

  switch (rule.op) {
    case 'regex': {
      const re = compileRegex(rule.value)
      result = re ? re.test(raw) : false
      break
    }
    case 'eq':
      result = raw.toLowerCase() === rule.value.toLowerCase()
      break
    case 'contains':
      result = raw.toLowerCase().includes(rule.value.toLowerCase())
      break
    case 'gt':
      result = Number(raw) > Number(rule.value)
      break
    case 'lt':
      result = Number(raw) < Number(rule.value)
      break
    case 'range': {
      const [min, max] = rule.value.split('-').map(Number)
      const n = Number(raw)
      result = n >= min && n <= max
      break
    }
    default:
      result = false
  }

  return rule.negate ? !result : result
}

export function evaluateFilterSet(
  requests: NetworkRequest[],
  filterSet: FilterSet
): NetworkRequest[] {
  if (filterSet.rules.length === 0) return requests

  return requests.filter((req) => {
    const results = filterSet.rules.map((rule) => evaluateRule(req, rule))
    return filterSet.combinator === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean)
  })
}

// ── Sorting ───────────────────────────────────────────────────

function sortValue(req: NetworkRequest, field: SortField): string | number {
  switch (field) {
    case 'url':
      return req.url
    case 'method':
      return req.method
    case 'status':
      return req.status ?? 0
    case 'protocol':
      return req.protocol
    case 'duration':
      return req.timing.duration ?? 0
    case 'start':
      return req.timing.start
  }
}

export function sortRequests(
  requests: NetworkRequest[],
  keys: SortKey[]
): NetworkRequest[] {
  if (keys.length === 0) return requests

  return [...requests].sort((a, b) => {
    for (const key of keys) {
      const va = sortValue(a, key.field)
      const vb = sortValue(b, key.field)
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb))
      }
      if (cmp !== 0) return key.dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

// ── Grouping ──────────────────────────────────────────────────

function groupKey(req: NetworkRequest, config: GroupConfig): string {
  switch (config.by) {
    case 'none':
      return 'all'
    case 'domain':
      try {
        return new URL(req.url).host
      } catch {
        return '(invalid)'
      }
    case 'endpoint':
      try {
        return new URL(req.url).pathname
      } catch {
        return req.url
      }
    case 'status-class': {
      const s = req.status ?? 0
      if (s === 0) return 'pending/failed'
      return `${Math.floor(s / 100)}xx`
    }
    case 'protocol':
      return req.protocol
    case 'method':
      return req.method
    case 'regex-capture': {
      if (!config.capturePattern) return '(no pattern)'
      const re = compileRegex(config.capturePattern)
      if (!re) return '(bad regex)'
      const m = re.exec(req.url)
      if (!m) return '(no match)'
      // Prefer first named group, else first capture group, else full match
      const named = m.groups ? Object.values(m.groups)[0] : undefined
      return named ?? m[1] ?? m[0]
    }
  }
}

export function groupRequests(
  requests: NetworkRequest[],
  config: GroupConfig
): RequestGroup[] {
  const map = new Map<string, NetworkRequest[]>()

  for (const req of requests) {
    const key = groupKey(req, config)
    const arr = map.get(key)
    if (arr) {
      arr.push(req)
    } else {
      map.set(key, [req])
    }
  }

  return Array.from(map.entries()).map(([key, reqs]) => ({
    key,
    requests: reqs,
    stats: computeStats(reqs),
  }))
}

function computeStats(reqs: NetworkRequest[]): RequestGroup['stats'] {
  let totalDuration = 0
  let durationCount = 0
  let totalSize = 0
  let errorCount = 0

  for (const r of reqs) {
    if (r.timing.duration != null) {
      totalDuration += r.timing.duration
      durationCount++
    }
    totalSize += (r.responseBody?.length ?? 0) + (r.requestBody?.length ?? 0)
    if (r.error || (r.status ?? 0) >= 400) errorCount++
  }

  return {
    count: reqs.length,
    avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    totalSize,
    errorCount,
  }
}

// ── Combined pipeline ─────────────────────────────────────────

export interface QueryConfig {
  filterSet: FilterSet
  sort: SortKey[]
  group: GroupConfig
}

export function runQuery(
  requests: NetworkRequest[],
  config: QueryConfig
): RequestGroup[] {
  const filtered = evaluateFilterSet(requests, config.filterSet)
  const sorted = sortRequests(filtered, config.sort)
  return groupRequests(sorted, config.group)
}
