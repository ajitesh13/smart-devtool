import type { ConsoleEntry, StackFrame } from '../shared/types'
import type { NetworkInterceptor } from './network-interceptor'
import { getConfig } from '../shared/config'

const HEURISTIC_WINDOW_MS = 1500

export class ConsoleInterceptor {
  private tabId: number
  private network: NetworkInterceptor
  private entries: ConsoleEntry[] = []
  private seq = 0
  private heuristicEnabled = true

  constructor(tabId: number, network: NetworkInterceptor) {
    this.tabId = tabId
    this.network = network
    chrome.debugger.onEvent.addListener(this.handleEvent)

    // Load heuristic-link preference (default ON) and track changes live
    getConfig().then((c) => {
      this.heuristicEnabled = c.heuristicConsoleLinks !== false
    })
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['heuristicConsoleLinks']) {
        this.heuristicEnabled = changes['heuristicConsoleLinks'].newValue !== false
      }
    })
  }

  async enable(): Promise<void> {
    await chrome.debugger.sendCommand({ tabId: this.tabId }, 'Runtime.enable', {})
    await chrome.debugger.sendCommand({ tabId: this.tabId }, 'Log.enable', {})
  }

  getEntries(): ConsoleEntry[] {
    return this.entries
  }

  clear(): void {
    this.entries = []
  }

  destroy(): void {
    chrome.debugger.onEvent.removeListener(this.handleEvent)
  }

  private handleEvent = (
    source: chrome.debugger.Debuggee,
    method: string,
    params: unknown
  ): void => {
    if (source.tabId !== this.tabId) return
    const p = params as Record<string, unknown>

    if (method === 'Runtime.consoleAPICalled') {
      this.onConsoleAPICalled(p)
    } else if (method === 'Log.entryAdded') {
      this.onLogEntryAdded(p)
    }
  }

  private onConsoleAPICalled(p: Record<string, unknown>): void {
    const type = p['type'] as string
    const args = (p['args'] as Record<string, unknown>[]) ?? []
    const message = args.map(formatArg).join(' ')
    const stackTrace = parseStackTrace(p['stackTrace'] as Record<string, unknown> | undefined)

    this.push({
      id: `c${this.seq++}`,
      level: mapConsoleType(type),
      message,
      timestamp: Date.now(),
      source: stackTrace[0]?.url,
      lineNumber: stackTrace[0]?.lineNumber,
      stackTrace,
    })
  }

  private onLogEntryAdded(p: Record<string, unknown>): void {
    const entry = p['entry'] as Record<string, unknown>
    if (!entry) return

    const text = entry['text'] as string
    const networkRequestId = entry['networkRequestId'] as string | undefined
    const url = entry['url'] as string | undefined
    const stackTrace = parseStackTrace(entry['stackTrace'] as Record<string, unknown> | undefined)

    this.push({
      id: `l${this.seq++}`,
      level: mapLogLevel(entry['level'] as string),
      message: text,
      timestamp: Date.now(),
      source: url,
      lineNumber: entry['lineNumber'] as number | undefined,
      stackTrace,
      // Chrome directly ties this browser log to a network request — hard link
      ...(networkRequestId
        ? { relatedRequestId: networkRequestId, relatedUrl: url, linkType: 'hard' as const }
        : {}),
    })
  }

  private push(entry: ConsoleEntry): void {
    // If not already hard-linked, try to correlate against captured requests
    if (!entry.relatedRequestId) {
      const link = this.correlate(entry)
      if (link) {
        entry.relatedRequestId = link.id
        entry.relatedUrl = link.url
        entry.linkType = link.type
        entry.linkReason = link.reason
        entry.linkDelayMs = link.delayMs
      }
    }
    this.entries.push(entry)
  }

  private correlate(entry: ConsoleEntry): {
    id: string
    url: string
    type: 'hard' | 'heuristic'
    reason: string
    delayMs?: number
  } | null {
    const requests = this.network.getRequests()

    // 1. Hard: a captured request URL appears verbatim in the log message
    for (const req of requests) {
      if (entry.message.includes(req.url)) {
        return { id: req.id, url: req.url, type: 'hard', reason: 'request URL found in log message' }
      }
    }

    // 2. Hard: a stack-frame URL matches a request URL
    if (entry.stackTrace) {
      for (const frame of entry.stackTrace) {
        const match = requests.find((r) => r.url === frame.url)
        if (match) return { id: match.id, url: match.url, type: 'hard', reason: 'stack frame URL matches request' }
      }
    }

    // 3. Heuristic: most recent request that finished just before this log
    if (!this.heuristicEnabled) return null

    let best: { id: string; url: string } | null = null
    let bestDelta = HEURISTIC_WINDOW_MS
    for (const req of requests) {
      const end = req.timing.end
      if (end == null) continue
      const delta = entry.timestamp - end
      if (delta >= 0 && delta < bestDelta) {
        bestDelta = delta
        best = { id: req.id, url: req.url }
      }
    }
    return best
      ? { ...best, type: 'heuristic', reason: 'request finished shortly before log', delayMs: Math.round(bestDelta) }
      : null
  }
}

// ── helpers ───────────────────────────────────────────────────

function mapConsoleType(type: string): ConsoleEntry['level'] {
  switch (type) {
    case 'warning':
      return 'warn'
    case 'error':
    case 'assert':
      return 'error'
    case 'info':
      return 'info'
    case 'debug':
      return 'debug'
    default:
      return 'log'
  }
}

function mapLogLevel(level: string): ConsoleEntry['level'] {
  switch (level) {
    case 'warning':
      return 'warn'
    case 'error':
      return 'error'
    case 'verbose':
      return 'debug'
    default:
      return 'info'
  }
}

function formatArg(arg: Record<string, unknown>): string {
  if (arg['value'] !== undefined) return String(arg['value'])
  if (arg['description'] !== undefined) return String(arg['description'])
  if (arg['unserializableValue'] !== undefined) return String(arg['unserializableValue'])
  const type = arg['type']
  if (type === 'undefined') return 'undefined'
  if (type === 'object' && arg['subtype'] === 'null') return 'null'
  return arg['className'] ? `[${arg['className']}]` : String(type ?? '')
}

function parseStackTrace(st: Record<string, unknown> | undefined): StackFrame[] {
  if (!st) return []
  const frames = (st['callFrames'] as Record<string, unknown>[]) ?? []
  return frames.map((f) => ({
    url: (f['url'] as string) ?? '',
    functionName: (f['functionName'] as string) ?? '(anonymous)',
    lineNumber: (f['lineNumber'] as number) ?? 0,
    columnNumber: f['columnNumber'] as number | undefined,
  }))
}
