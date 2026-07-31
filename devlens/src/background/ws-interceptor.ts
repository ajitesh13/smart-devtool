import type { NetworkInterceptor } from './network-interceptor'

export class WSInterceptor {
  private tabId: number
  private networkInterceptor: NetworkInterceptor

  constructor(tabId: number, networkInterceptor: NetworkInterceptor) {
    this.tabId = tabId
    this.networkInterceptor = networkInterceptor
    chrome.debugger.onEvent.addListener(this.handleEvent)
  }

  async enable(): Promise<void> {
    // Network.enable covers WebSocket events — no extra command needed
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
    const requestId = p['requestId'] as string

    switch (method) {
      // Lifecycle — create a record even without a matching requestWillBeSent
      case 'Network.webSocketCreated': {
        const req = this.networkInterceptor.ensureRequest(requestId, p['url'] as string, 'WS')
        req.wsState = 'connecting'
        break
      }
      case 'Network.webSocketHandshakeResponseReceived': {
        const req = this.networkInterceptor.getRequest(requestId)
        if (req) {
          req.wsState = 'open'
          const resp = p['response'] as Record<string, unknown> | undefined
          if (resp) {
            req.status = resp['status'] as number
            req.statusText = resp['statusText'] as string
          }
        }
        break
      }
      case 'Network.webSocketClosed': {
        const req = this.networkInterceptor.getRequest(requestId)
        if (req) {
          req.wsState = 'closed'
          req.timing.end = Date.now()
          req.timing.duration = req.timing.end - req.timing.start
        }
        break
      }
      case 'Network.webSocketFrameError': {
        const req = this.networkInterceptor.getRequest(requestId)
        if (req) req.error = (p['errorMessage'] as string) ?? 'WebSocket frame error'
        break
      }
      case 'Network.webSocketFrameSent':
      case 'Network.webSocketFrameReceived': {
        const frame = p['response'] as Record<string, unknown>
        const data = (frame['payloadData'] as string) ?? ''
        this.networkInterceptor.addWSFrame(requestId, {
          type: method === 'Network.webSocketFrameSent' ? 'send' : 'receive',
          data,
          timestamp: Date.now(),
          size: data.length,
        })
        break
      }
    }
  }
}
