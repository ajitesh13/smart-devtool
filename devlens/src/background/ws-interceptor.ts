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

    if (method === 'Network.webSocketFrameSent' || method === 'Network.webSocketFrameReceived') {
      const requestId = p['requestId'] as string
      const frame = p['response'] as Record<string, unknown>
      this.networkInterceptor.addWSFrame(requestId, {
        type: method === 'Network.webSocketFrameSent' ? 'send' : 'receive',
        data: frame['payloadData'] as string,
        timestamp: Date.now(),
        size: ((frame['payloadData'] as string) ?? '').length,
      })
    }
  }
}
