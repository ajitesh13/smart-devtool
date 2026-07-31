import type { FC } from 'react'
import type { Pane } from '../../store/view.store'
import type { GroupBy, SortField } from '../../lib/query-engine'
import { FilterBuilder } from './FilterBuilder'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'domain', label: 'Domain' },
  { value: 'endpoint', label: 'Endpoint' },
  { value: 'status-class', label: 'Status class' },
  { value: 'method', label: 'Method' },
  { value: 'regex-capture', label: 'Regex capture' },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'start', label: 'Time' },
  { value: 'url', label: 'URL' },
  { value: 'status', label: 'Status' },
  { value: 'duration', label: 'Duration' },
  { value: 'method', label: 'Method' },
]

interface Props {
  pane: Pane
  count: number
  onUpdate: (updates: Partial<Pane>) => void
}

export const PaneToolbar: FC<Props> = ({ pane, count, onUpdate }) => {
  const primarySort = pane.sort[0] ?? { field: 'start', dir: 'asc' }

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs relative">
      <span className="font-semibold text-gray-700 dark:text-gray-200">{pane.title}</span>
      <span className="px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {count}
      </span>

      <FilterBuilder
        filterSet={pane.filterSet}
        onChange={(filterSet) => onUpdate({ filterSet })}
      />

      <label className="flex items-center gap-1 ml-auto text-gray-500">
        group
        <select
          value={pane.group.by}
          onChange={(e) => onUpdate({ group: { ...pane.group, by: e.target.value as GroupBy } })}
          className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        >
          {GROUP_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </label>

      {pane.group.by === 'regex-capture' && (
        <input
          value={pane.group.capturePattern ?? ''}
          onChange={(e) => onUpdate({ group: { ...pane.group, capturePattern: e.target.value } })}
          placeholder="/(?<g>v\d+)/"
          className="w-28 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 font-mono"
        />
      )}

      <label className="flex items-center gap-1 text-gray-500">
        sort
        <select
          value={primarySort.field}
          onChange={(e) => onUpdate({ sort: [{ field: e.target.value as SortField, dir: primarySort.dir }] })}
          className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        >
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button
          onClick={() => onUpdate({ sort: [{ field: primarySort.field, dir: primarySort.dir === 'asc' ? 'desc' : 'asc' }] })}
          className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700"
          title="Toggle direction"
        >
          {primarySort.dir === 'asc' ? '↑' : '↓'}
        </button>
      </label>
    </div>
  )
}
