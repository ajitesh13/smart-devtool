import { type FC, useState, useEffect } from 'react'
import { getConfig, setConfig } from '../../../shared/config'

export const SettingsPanel: FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [port, setPort] = useState('3000')
  const [autoConnect, setAutoConnect] = useState(false)
  const [excludePatterns, setExcludePatterns] = useState('')
  const [heuristicLinks, setHeuristicLinks] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getConfig().then((config) => {
      setApiKey(config.anthropicApiKey ?? '')
      setPort(String(config.claudeCodePort ?? 3000))
      setAutoConnect(config.claudeCodeAutoConnect ?? false)
      setExcludePatterns((config.excludePatterns ?? []).join('\n'))
      setHeuristicLinks(config.heuristicConsoleLinks !== false)
    })
  }, [])

  const handleSave = async () => {
    await setConfig({
      anthropicApiKey: apiKey || undefined,
      claudeCodePort: Number(port) || 3000,
      claudeCodeAutoConnect: autoConnect,
      excludePatterns: excludePatterns.split('\n').map((s) => s.trim()).filter(Boolean),
      heuristicConsoleLinks: heuristicLinks,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-lg space-y-6 text-sm text-gray-900 dark:text-gray-100">
      <h2 className="text-base font-semibold">Settings</h2>

      <div className="space-y-2">
        <label className="block font-medium text-gray-700 dark:text-gray-300">
          Anthropic API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
        />
        <p className="text-xs text-gray-500">Stored locally in chrome.storage.local. Never transmitted externally.</p>
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-gray-700 dark:text-gray-300">
          Claude Code Port
        </label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
        />
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => setAutoConnect(e.target.checked)}
          />
          <span className="text-gray-700 dark:text-gray-300">Auto-connect on DevTools open</span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-gray-700 dark:text-gray-300">
          Exclude URL Patterns (one per line)
        </label>
        <textarea
          value={excludePatterns}
          onChange={(e) => setExcludePatterns(e.target.value)}
          rows={4}
          placeholder="*.analytics.*&#10;chrome-extension://*"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm font-mono"
        />
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-gray-700 dark:text-gray-300">
          Console → Network Linking
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={heuristicLinks}
            onChange={(e) => setHeuristicLinks(e.target.checked)}
          />
          <span className="text-gray-700 dark:text-gray-300">Enable heuristic (timing-based) links</span>
        </label>
        <p className="text-xs text-gray-500">
          Hard links (URL match, browser-reported network errors) are always shown. Heuristic links
          guess from timing and can mislink when many requests fire together — disable for high-signal-only.
        </p>
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  )
}
