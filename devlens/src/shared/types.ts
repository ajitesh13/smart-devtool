export interface WSFrame {
  type: 'send' | 'receive'
  data: string
  timestamp: number
  size: number
}

export interface NetworkRequest {
  id: string
  url: string
  method: string
  protocol: 'XHR' | 'Fetch' | 'WS' | 'SSE' | 'Other'
  status?: number
  statusText?: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: string
  responseBody?: string
  timing: { start: number; end?: number; duration?: number }
  wsFrames?: WSFrame[]
  error?: string
}

export interface StackFrame {
  url: string
  functionName: string
  lineNumber: number
  columnNumber?: number
}

export interface ConsoleEntry {
  id: string
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
  source?: string
  lineNumber?: number
  stackTrace?: StackFrame[]
  // Correlation to a NetworkRequest.id that produced/relates to this log
  relatedRequestId?: string
  relatedUrl?: string
  linkType?: 'hard' | 'heuristic'
  linkReason?: string
  linkDelayMs?: number
}

export interface PerfSnapshot {
  timestamp: number
  jsHeapUsed: number
  jsHeapTotal: number
  fps?: number
  longTasks?: number
}

export interface DebugContext {
  type: 'network' | 'console' | 'performance' | 'state'
  data: NetworkRequest | ConsoleEntry[] | PerfSnapshot | Record<string, unknown>
  tabUrl?: string
  timestamp: number
}

export type Tier = 'free' | 'pro' | 'team'

export interface Config {
  anthropicApiKey?: string
  claudeCodePort?: number
  claudeCodeAutoConnect?: boolean
  licenseKey?: string
  tier?: Tier
  excludePatterns?: string[]
  heuristicConsoleLinks?: boolean
}
