import { type FC, useMemo } from 'react'
import { useConsoleStore, selectFilteredEntries } from '../../store/console.store'
import { useNetworkStore } from '../../store/network.store'
import { useUIStore } from '../../store/ui.store'
import { ConsoleFilterBar } from './ConsoleFilterBar'
import type { ConsoleEntry } from '../../../shared/types'

const LEVEL_STYLE: Record<ConsoleEntry['level'], string> = {
  error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
  warn: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40',
  info: 'text-blue-700 dark:text-blue-300',
  log: 'text-gray-800 dark:text-gray-200',
  debug: 'text-purple-700 dark:text-purple-400',
}

const LEVEL_ICON: Record<ConsoleEntry['level'], string> = {
  error: '⛔',
  warn: '⚠️',
  info: 'ℹ️',
  log: '›',
  debug: '🐛',
}

function buildLinkTooltip(entry: ConsoleEntry): string {
  const confidence = entry.linkType === 'hard' ? 'High confidence (hard link)' : 'Low confidence (heuristic guess)'
  const reason = entry.linkReason ? `\nWhy: ${entry.linkReason}` : ''
  const delay = entry.linkDelayMs != null ? `\nΔ ${entry.linkDelayMs}ms before log` : ''
  return `${confidence}${reason}${delay}\n${entry.relatedUrl ?? ''}\nClick to open request`
}

function shortUrl(url?: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.pathname.split('/').pop() || u.host
  } catch {
    return url
  }
}

const EntryRow: FC<{ entry: ConsoleEntry }> = ({ entry }) => {
  const requests = useNetworkStore((s) => s.requests)
  const selectRequest = useNetworkStore((s) => s.selectRequest)
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  const jumpToRequest = () => {
    const req = requests.find((r) => r.id === entry.relatedRequestId)
    if (req) {
      selectRequest(req)
      setActiveTab('network')
    }
  }

  return (
    <div className={`flex items-start gap-2 px-3 py-1 border-b border-gray-100 dark:border-gray-800 font-mono text-xs ${LEVEL_STYLE[entry.level]}`}>
      <span className="shrink-0 select-none">{LEVEL_ICON[entry.level]}</span>
      <span className="flex-1 whitespace-pre-wrap break-all">{entry.message}</span>

      {entry.relatedRequestId && (
        <button
          onClick={jumpToRequest}
          title={buildLinkTooltip(entry)}
          className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
            entry.linkType === 'hard'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
          }`}
        >
          🔗 {shortUrl(entry.relatedUrl)}{entry.linkType === 'heuristic' ? ' ?' : ''}
        </button>
      )}

      {entry.source && (
        <span className="shrink-0 text-gray-400 dark:text-gray-500" title={entry.source}>
          {shortUrl(entry.source)}{entry.lineNumber != null ? `:${entry.lineNumber}` : ''}
        </span>
      )}
    </div>
  )
}

export const ConsolePanel: FC = () => {
  const entries = useConsoleStore(selectFilteredEntries)
  const total = useConsoleStore((s) => s.entries.length)

  const linkedCount = useMemo(
    () => entries.filter((e) => e.relatedRequestId).length,
    [entries]
  )

  return (
    <div className="flex flex-col h-full">
      <ConsoleFilterBar />
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 text-center px-4">
            {total === 0
              ? 'No console output captured. Reload the page with recording on.'
              : 'No entries match the current filter.'}
          </div>
        ) : (
          entries.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </div>
      <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {entries.length} shown · {linkedCount} linked to a request
      </div>
    </div>
  )
}
