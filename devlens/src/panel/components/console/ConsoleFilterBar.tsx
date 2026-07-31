import type { FC } from 'react'
import { useConsoleStore, countByLevel, type LinkFilter } from '../../store/console.store'
import type { ConsoleEntry } from '../../../shared/types'

const LEVELS: { level: ConsoleEntry['level']; label: string; color: string }[] = [
  { level: 'error', label: 'Errors', color: 'text-red-500' },
  { level: 'warn', label: 'Warnings', color: 'text-yellow-500' },
  { level: 'info', label: 'Info', color: 'text-blue-500' },
  { level: 'log', label: 'Logs', color: 'text-gray-500' },
  { level: 'debug', label: 'Debug', color: 'text-purple-500' },
]

const LINK_OPTS: { value: LinkFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'linked', label: '🔗 Linked to request' },
  { value: 'unlinked', label: 'Unlinked' },
]

export const ConsoleFilterBar: FC = () => {
  const { entries, filter, setFilter, toggleLevel, clearEntries } = useConsoleStore()
  const counts = countByLevel(entries)

  return (
    <div className="flex flex-col gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={clearEntries}
          className="px-2 py-1 rounded font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Clear
        </button>

        {LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => toggleLevel(l.level)}
            className={`px-2 py-0.5 rounded font-medium border ${
              filter.levels.has(l.level)
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                : 'opacity-40 border-transparent'
            } ${l.color}`}
          >
            {l.label} ({counts[l.level]})
          </button>
        ))}

        <select
          value={filter.linkFilter}
          onChange={(e) => setFilter({ linkFilter: e.target.value as LinkFilter })}
          className="ml-auto px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        >
          {LINK_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={filter.useRegex ? 'regex on message…' : 'filter message…'}
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono"
        />
        <button
          onClick={() => setFilter({ useRegex: !filter.useRegex })}
          className={`px-2 py-1 rounded font-mono font-medium ${
            filter.useRegex ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
          title="Toggle regex"
        >
          .*
        </button>
        <input
          type="text"
          placeholder="source url…"
          value={filter.sourceSearch}
          onChange={(e) => setFilter({ sourceSearch: e.target.value })}
          className="w-40 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono"
        />
      </div>
    </div>
  )
}
