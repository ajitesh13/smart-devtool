import type { NetworkRequest, WSFrame, SSEEvent } from '../shared/types'
import { parseGraphQL } from '../shared/graphql'

export class NetworkInterceptor {
  private requests = new Map<string, NetworkRequest>()
  private tabId: number

  constructor(tabId: number) {
    this.tabId = tabId
    chrome.debugger.onEvent.addListener(this.handleEvent)
  }

  async enable(): Promise<void> {
    await chrome.debugger.sendCommand({ tabId: this.tabId }, 'Network.enable', {})
  }

  getRequests(): NetworkRequest[] {
    return Array.from(this.requests.values())
  }

  clear(): void {
    this.requests.clear()
  }

  addWSFrame(requestId: string, frame: WSFrame): void {
    const req = this.requests.get(requestId)
    if (req) {
      req.wsFrames = req.wsFrames ?? []
      req.wsFrames.push(frame)
    }
  }

  /** Look up (or lazily create) a request record — used by WS lifecycle events. */
  ensureRequest(requestId: string, url: string, protocol: NetworkRequest['protocol']): NetworkRequest {
    let req = this.requests.get(requestId)
    if (!req) {
      req = {
        id: requestId,
        url,
        method: 'GET',
        protocol,
        requestHeaders: {},
        responseHeaders: {},
        timing: { start: Date.now() },
      }
      this.requests.set(requestId, req)
    }
    return req
  }

  getRequest(requestId: string): NetworkRequest | undefined {
    return this.requests.get(requestId)
  }

  addSSEEvent(requestId: string, event: SSEEvent): void {
    const req = this.requests.get(requestId)
    if (req) {
      req.protocol = 'SSE'
      req.sseEvents = req.sseEvents ?? []
      req.sseEvents.push(event)
    }
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

    switch (method) {
      case 'Network.requestWillBeSent':
        this.onRequestWillBeSent(p)
        break
      case 'Network.responseReceived':
        this.onResponseReceived(p)
        break
      case 'Network.loadingFinished':
        this.onLoadingFinished(p)
        break
      case 'Network.loadingFailed':
        this.onLoadingFailed(p)
        break
      case 'Network.eventSourceMessageReceived':
        this.onEventSourceMessage(p)
        break
    }
  }

  private onEventSourceMessage(p: Record<string, unknown>): void {
    const requestId = p['requestId'] as string
    this.addSSEEvent(requestId, {
      eventName: (p['eventName'] as string) || undefined,
      data: (p['data'] as string) ?? '',
      eventId: (p['eventId'] as string) || undefined,
      timestamp: Date.now(),
    })
  }

  private onRequestWillBeSent(p: Record<string, unknown>): void {
    const requestId = p['requestId'] as string
    const request = p['request'] as Record<string, unknown>
    const url = request['url'] as string
    const method = request['method'] as string
    const headers = (request['headers'] as Record<string, string>) ?? {}
    const postData = request['postData'] as string | undefined
    const hasPostData = request['hasPostData'] as boolean | undefined

    const req: NetworkRequest = {
      id: requestId,
      url,
      method,
      protocol: this.detectProtocol(url, headers),
      requestHeaders: headers,
      responseHeaders: {},
      requestBody: postData,
      timing: { start: Date.now() },
    }
    this.applyGraphQL(req, postData)
    this.requests.set(requestId, req)

    // postData is omitted from the event for large/streamed bodies — fetch it.
    if (hasPostData && !postData) {
      chrome.debugger
        .sendCommand({ tabId: this.tabId }, 'Network.getRequestPostData', { requestId })
        .then((result) => {
          const body = (result as { postData?: string })?.postData
          const r = this.requests.get(requestId)
          if (r && body) {
            r.requestBody = body
            this.applyGraphQL(r, body)
          }
        })
        .catch(() => undefined)
    }
  }

  private applyGraphQL(req: NetworkRequest, body: string | undefined): void {
    const gql = parseGraphQL(body)
    if (gql) {
      req.graphqlOperation = gql.operation
      req.graphqlType = gql.type
    }
  }

  private onResponseReceived(p: Record<string, unknown>): void {
    const requestId = p['requestId'] as string
    const response = p['response'] as Record<string, unknown>
    const req = this.requests.get(requestId)
    if (!req) return

    req.status = response['status'] as number
    req.statusText = response['statusText'] as string
    req.responseHeaders = (response['headers'] as Record<string, string>) ?? {}

    if (req.protocol === 'SSE' || (req.responseHeaders['content-type'] ?? '').includes('text/event-stream')) {
      req.protocol = 'SSE'
    }
  }

  private onLoadingFinished(p: Record<string, unknown>): void {
    const requestId = p['requestId'] as string
    const req = this.requests.get(requestId)
    if (!req) return

    req.timing.end = Date.now()
    req.timing.duration = req.timing.end - req.timing.start

    if (req.protocol !== 'WS' && req.protocol !== 'SSE') {
      chrome.debugger.sendCommand(
        { tabId: this.tabId },
        'Network.getResponseBody',
        { requestId }
      ).then((result) => {
        const body = result as { body: string; base64Encoded: boolean }
        req.responseBody = body.base64Encoded
          ? atob(body.body)
          : body.body
      }).catch(() => undefined)
    }
  }

  private onLoadingFailed(p: Record<string, unknown>): void {
    const requestId = p['requestId'] as string
    const req = this.requests.get(requestId)
    if (!req) return

    req.error = p['errorText'] as string
    req.timing.end = Date.now()
    req.timing.duration = req.timing.end - req.timing.start
  }

  private detectProtocol(url: string, headers: Record<string, string>): NetworkRequest['protocol'] {
    if (url.startsWith('ws://') || url.startsWith('wss://')) return 'WS'
    const accept = headers['accept'] ?? headers['Accept'] ?? ''
    if (accept.includes('text/event-stream')) return 'SSE'
    const requested = headers['x-requested-with'] ?? headers['X-Requested-With'] ?? ''
    if (requested.toLowerCase() === 'xmlhttprequest') return 'XHR'
    return 'Fetch'
  }
}
