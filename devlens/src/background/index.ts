import { NetworkInterceptor } from './network-interceptor'
import { WSInterceptor } from './ws-interceptor'
import { ConsoleInterceptor } from './console-interceptor'
import { PerfInterceptor } from './perf-interceptor'
import { MockInterceptor } from './mock-interceptor'
import { getConfig, setConfig } from '../shared/config'
import type { MockRule } from '../shared/types'

interface TabInterceptors {
  network: NetworkInterceptor
  ws: WSInterceptor
  console: ConsoleInterceptor
  perf: PerfInterceptor
  mock: MockInterceptor
}

const interceptors = new Map<number, TabInterceptors>()

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId) {
    interceptors.delete(source.tabId)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, tabId, payload } = message

  if (type === 'ATTACH_DEBUGGER') {
    attachToTab(tabId).then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }))
    return true
  }

  if (type === 'DETACH_DEBUGGER') {
    detachFromTab(tabId).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }

  if (type === 'GET_REQUESTS') {
    const entry = interceptors.get(tabId)
    sendResponse({ requests: entry?.network.getRequests() ?? [] })
    return true
  }

  if (type === 'CLEAR_REQUESTS') {
    interceptors.get(tabId)?.network.clear()
    sendResponse({ ok: true })
    return true
  }

  if (type === 'GET_CONSOLE') {
    const entry = interceptors.get(tabId)
    sendResponse({ entries: entry?.console.getEntries() ?? [] })
    return true
  }

  if (type === 'CLEAR_CONSOLE') {
    interceptors.get(tabId)?.console.clear()
    sendResponse({ ok: true })
    return true
  }

  if (type === 'GET_PERF') {
    const entry = interceptors.get(tabId)
    sendResponse({
      snapshots: entry?.perf.getSnapshots() ?? [],
      provenance: entry?.perf.getProvenance() ?? [],
    })
    return true
  }

  if (type === 'CLEAR_PERF') {
    interceptors.get(tabId)?.perf.clear()
    sendResponse({ ok: true })
    return true
  }

  if (type === 'COMPUTE_PROVENANCE') {
    const entry = interceptors.get(tabId)
    if (!entry) {
      sendResponse({ provenance: [] })
      return true
    }
    entry.perf
      .computeProvenance()
      .then((provenance) => sendResponse({ provenance }))
      .catch((err) => sendResponse({ provenance: [], error: String(err) }))
    return true
  }

  if (type === 'SCAN_DETACHED') {
    const entry = interceptors.get(tabId)
    if (!entry) {
      sendResponse({ detached: [] })
      return true
    }
    entry.perf
      .scanDetached()
      .then((detached) => sendResponse({ detached }))
      .catch((err) => sendResponse({ detached: [], error: String(err) }))
    return true
  }

  if (type === 'SET_MOCK_RULES') {
    const entry = interceptors.get(tabId)
    const rules = (payload?.rules ?? []) as MockRule[]
    setConfig({ mockRules: rules }).catch(() => undefined)
    if (!entry) {
      sendResponse({ ok: true })
      return true
    }
    entry.mock
      .setRules(rules)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }))
    return true
  }

  if (type === 'GET_MOCK_RULES') {
    getConfig()
      .then((cfg) => sendResponse({ rules: cfg.mockRules ?? [] }))
      .catch(() => sendResponse({ rules: [] }))
    return true
  }

  if (type === 'SEND_TO_MCP' && payload) {
    import('./mcp-bridge').then(({ MCPBridge }) => {
      MCPBridge.getInstance().send(payload)
      sendResponse({ ok: true })
    })
    return true
  }
})

async function attachToTab(tabId: number): Promise<void> {
  if (interceptors.has(tabId)) return

  await chrome.debugger.attach({ tabId }, '1.3')
  const network = new NetworkInterceptor(tabId)
  const ws = new WSInterceptor(tabId, network)
  const console = new ConsoleInterceptor(tabId, network)
  const perf = new PerfInterceptor(tabId)
  const mock = new MockInterceptor(tabId, network)
  interceptors.set(tabId, { network, ws, console, perf, mock })
  await network.enable()
  await ws.enable()
  await console.enable()
  await perf.enable()
  // Fetch interception must be enabled AFTER Network so paused requests still
  // correlate; only activates if the user already has saved rules.
  const cfg = await getConfig()
  if (cfg.mockRules?.length) await mock.setRules(cfg.mockRules)
}

async function detachFromTab(tabId: number): Promise<void> {
  const entry = interceptors.get(tabId)
  if (!entry) return
  entry.mock.destroy()
  entry.perf.destroy()
  await chrome.debugger.detach({ tabId })
  interceptors.delete(tabId)
}
