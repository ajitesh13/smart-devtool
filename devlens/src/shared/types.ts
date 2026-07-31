export interface WSFrame {
  type: 'send' | 'receive'
  data: string
  timestamp: number
  size: number
}

/** A single Server-Sent Event captured off an EventSource stream. */
export interface SSEEvent {
  eventName?: string
  data: string
  eventId?: string
  timestamp: number
}

export type WSState = 'connecting' | 'open' | 'closed'
export type GraphQLType = 'query' | 'mutation' | 'subscription'

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
  wsState?: WSState
  sseEvents?: SSEEvent[]
  // Populated when the request body is a GraphQL operation
  graphqlOperation?: string
  graphqlType?: GraphQLType
  // Set when a DevLens mock rule altered this response
  mocked?: boolean
  error?: string
}

/** A user-defined request override / mock / throttle rule. */
export interface MockRule {
  id: string
  enabled: boolean
  /** Substring or regex (see isRegex) matched against the request URL. */
  urlPattern: string
  isRegex?: boolean
  /** Only match this HTTP method (empty = any). */
  method?: string
  /** Force this status code on the response (undefined = passthrough status). */
  status?: number
  /** Replace the response body (undefined = passthrough body). */
  body?: string
  /** Override the Content-Type of the mocked response. */
  contentType?: string
  /** Add this many ms of latency before the response resolves. */
  delayMs?: number
  /** Fail the request with this CDP error reason (e.g. "Failed"). */
  failReason?: string
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
  nodes: number
  jsEventListeners: number
  documents: number
  frames: number
  layoutCount: number
  recalcStyleCount: number
  // Cumulative CPU-time counters (seconds). Turn into a CPU % via cpuPercentBetween().
  scriptDuration: number
  taskDuration: number
  fps?: number
  longTasks?: number
}

/** One top-level DOM subtree and how many nodes hang off it (provenance). */
export interface DomSubtree {
  label: string
  nodeCount: number
}

/** A class of detached DOM nodes still retained by JS (leak candidate). */
export interface DetachedNode {
  description: string
  count: number
  retainedSize?: number
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
  mockRules?: MockRule[]
}
