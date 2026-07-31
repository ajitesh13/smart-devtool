import type { MockRule } from '../shared/types'
import type { NetworkInterceptor } from './network-interceptor'
import { matchRule } from '../shared/mock-match'

/**
 * Intercepts requests via the CDP `Fetch` domain to override status/body,
 * inject latency (per-pattern throttle), or fail requests — things native
 * DevTools cannot do (status-code override in particular).
 *
 * Fetch interception is only enabled while at least one rule is active, so
 * there is zero overhead when the user has no mocks configured.
 */
export class MockInterceptor {
  private tabId: number
  private network: NetworkInterceptor
  private rules: MockRule[] = []
  private fetchEnabled = false

  constructor(tabId: number, network: NetworkInterceptor) {
    this.tabId = tabId
    this.network = network
    chrome.debugger.onEvent.addListener(this.handleEvent)
  }

  async setRules(rules: MockRule[]): Promise<void> {
    this.rules = rules
    const anyActive = rules.some((r) => r.enabled)
    if (anyActive && !this.fetchEnabled) {
      await this.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] })
      this.fetchEnabled = true
    } else if (!anyActive && this.fetchEnabled) {
      await this.send('Fetch.disable', {})
      this.fetchEnabled = false
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
    if (method !== 'Fetch.requestPaused') return
    this.onRequestPaused(params as Record<string, unknown>).catch(() => {
      // Never leave a request hanging — best-effort continue.
      const id = (params as Record<string, unknown>)['requestId'] as string
      this.send('Fetch.continueRequest', { requestId: id }).catch(() => undefined)
    })
  }

  private async onRequestPaused(p: Record<string, unknown>): Promise<void> {
    const requestId = p['requestId'] as string
    const request = p['request'] as Record<string, unknown>
    const networkId = p['networkId'] as string | undefined
    const url = (request['url'] as string) ?? ''
    const method = (request['method'] as string) ?? 'GET'

    const rule = matchRule(this.rules, url, method)
    if (!rule) {
      await this.send('Fetch.continueRequest', { requestId })
      return
    }

    if (rule.delayMs && rule.delayMs > 0) {
      await delay(rule.delayMs)
    }

    if (rule.failReason) {
      this.markMocked(networkId)
      await this.send('Fetch.failRequest', { requestId, errorReason: rule.failReason })
      return
    }

    // Status and/or body override
    if (rule.status != null || rule.body != null) {
      this.markMocked(networkId)
      const headers: { name: string; value: string }[] = [
        { name: 'Content-Type', value: rule.contentType ?? 'application/json' },
        { name: 'X-DevLens-Mocked', value: '1' },
      ]
      await this.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: rule.status ?? 200,
        responseHeaders: headers,
        body: b64(rule.body ?? ''),
      })
      return
    }

    // Delay-only (throttle): let it proceed after the latency above.
    await this.send('Fetch.continueRequest', { requestId })
  }

  private markMocked(networkId?: string): void {
    if (!networkId) return
    const req = this.network.getRequest(networkId)
    if (req) req.mocked = true
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    return chrome.debugger.sendCommand({ tabId: this.tabId }, method, params)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** UTF-8 safe base64 for the (service-worker) global scope. */
function b64(str: string): string {
  // eslint-disable-next-line no-undef
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
