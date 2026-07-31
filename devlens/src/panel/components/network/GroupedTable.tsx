import { type FC, useState, useMemo } from 'react'
import type { RequestGroup } from '../../lib/query-engine'
import type { NetworkRequest } from '../../../shared/types'
import { useNetworkStore } from '../../store/network.store'
import { ProtocolBadge } from './ProtocolBadge'

const STATUS_COLOR = (status?: number) => {
  if (!status) return 'text-gray-400'
  if (status < 300) return 'text-green-600 dark:text-green-400'
  if (status < 400) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function trimUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

const RequestRow: FC<{ req: NetworkRequest }> = ({ req }) => {
  const selected = useNetworkStore((s) => s.selected)
  const selectRequest = useNetworkStore((s) => s.selectRequest)
  const isSelected = selected?.id === req.id

  return (
    <div
      onClick={() => selectRequest(req)}
      className={`grid grid-cols-[70px_1fr_60px_50px_70px] gap-1 px-3 py-1 text-xs cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950 ${
        isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
      } ${req.error ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}
    >
      <span><ProtocolBadge protocol={req.protocol} /></span>
      <span className="truncate font-mono" title={req.url}>{trimUrl(req.url)}</span>
      <span className="text-gray-500 dark:text-gray-400">{req.method}</span>
      <span className={STATUS_COLOR(req.status)}>{req.status ?? '—'}</span>
      <span className="text-right text-gray-500 dark:text-gray-400">
        {req.timing.duration != null ? `${req.timing.duration}ms` : '—'}
      </span>
    </div>
  )
}

const GroupHeader: FC<{ group: RequestGroup; collapsed: boolean; onToggle: () => void }> = ({
  group, collapsed, onToggle,
}) => (
  <div
    onClick={onToggle}
    className="flex items-center gap-2 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer sticky top-0 z-10"
  >
    <span className="text-gray-400">{collapsed ? '▶' : '▼'}</span>
    <span className="font-mono text-gray-700 dark:text-gray-200 truncate">{group.key}</span>
    <span className="px-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500">{group.stats.count}</span>
    {group.stats.errorCount > 0 && (
      <span className="text-red-500">{group.stats.errorCount} err</span>
    )}
    <span className="ml-auto text-gray-400">avg {group.stats.avgDuration}ms</span>
  </div>
)

interface Props {
  groups: RequestGroup[]
  ungrouped: boolean
}

export const GroupedTable: FC<Props> = ({ groups, ungrouped }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const totalRequests = useMemo(
    () => groups.reduce((sum, g) => sum + g.requests.length, 0),
    [groups]
  )

  if (totalRequests === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 p-4 text-center">
        No matching requests.
      </div>
    )
  }

  // Ungrouped: single flat list, skip group headers
  if (ungrouped) {
    const all = groups.flatMap((g) => g.requests)
    return (
      <div className="flex-1 overflow-y-auto">
        {all.map((req) => <RequestRow key={req.id} req={req} />)}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.key}>
          <GroupHeader
            group={group}
            collapsed={collapsed.has(group.key)}
            onToggle={() => toggle(group.key)}
          />
          {!collapsed.has(group.key) &&
            group.requests.map((req) => <RequestRow key={req.id} req={req} />)}
        </div>
      ))}
    </div>
  )
}
