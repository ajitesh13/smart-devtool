import { useState, useEffect, type FC } from 'react'
import { TabBar } from './components/layout/TabBar'
import { StatusBar } from './components/layout/StatusBar'
import { MultiPaneView } from './components/network/MultiPaneView'
import { ConsolePanel } from './components/console/ConsolePanel'
import { AIDrawer } from './components/ai/AIDrawer'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useNetworkStore } from './store/network.store'
import { useConsoleStore } from './store/console.store'
import { useUIStore } from './store/ui.store'
import { getConfig } from '../shared/config'

const App: FC = () => {
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const [mcpConnected, setMcpConnected] = useState(false)
  const { setRequests, setCapturing } = useNetworkStore()
  const setConsoleEntries = useConsoleStore((s) => s.setEntries)

  // Poll for new requests + console entries from background service worker
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>

    const start = async () => {
      const tabId = chrome.devtools.inspectedWindow.tabId

      // Attach debugger
      await chrome.runtime.sendMessage({ type: 'ATTACH_DEBUGGER', tabId })
      setCapturing(true)

      intervalId = setInterval(async () => {
        const [reqRes, conRes] = await Promise.all([
          chrome.runtime.sendMessage({ type: 'GET_REQUESTS', tabId }),
          chrome.runtime.sendMessage({ type: 'GET_CONSOLE', tabId }),
        ])
        if (reqRes?.requests) setRequests(reqRes.requests)
        if (conRes?.entries) setConsoleEntries(conRes.entries)
      }, 500)
    }

    start().catch(console.error)

    return () => {
      clearInterval(intervalId)
      const tabId = chrome.devtools.inspectedWindow.tabId
      chrome.runtime.sendMessage({ type: 'DETACH_DEBUGGER', tabId })
      setCapturing(false)
    }
  }, [setRequests, setCapturing, setConsoleEntries])

  // Auto-connect to Claude Code if configured
  useEffect(() => {
    getConfig().then((config) => {
      if (config.claudeCodeAutoConnect) {
        chrome.runtime.sendMessage({ type: 'MCP_CONNECT', payload: { port: config.claudeCodePort ?? 3000 } })
          .then((res) => setMcpConnected(res?.ok === true))
          .catch(() => undefined)
      }
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <TabBar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'network' && <MultiPaneView />}
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'performance' && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Performance panel — Phase 2
          </div>
        )}
        {activeTab === 'ai' && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Claude Code panel — Phase 3
          </div>
        )}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>

      <StatusBar mcpConnected={mcpConnected} />
      <AIDrawer />
    </div>
  )
}

export default App
