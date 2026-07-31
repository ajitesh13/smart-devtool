import { type FC, useMemo, useState } from 'react'
import { buildEvents, timelineWindow, layoutTimeline, type TimelineEvent, type TimelineKind } from '../../../shared/timeline'
import { useNetworkStore } from '../../store/network.store'
import { useConsoleStore } from '../../store/console.store'
import { usePerfStore } from '../../store/perf.store'
import { useUIStore } from '../../store/ui.store'

const LANES: { kind: TimelineKind; label: string }[] = [
  { kind: 'network', label: 'Network' },
  { kind: 'console', label: 'Console' },
  { kind: 'perf', label: 'Perf' },
]

const DOT: Record<TimelineEvent['severity'], string> = {
  error: 'bg-red-500',
  warn: 'bg-amber-500',
  ok: 'bg-green-500',
  info: 'bg-blue-400',
}

export const TimelinePanel: FC = () => {
  const requests = useNetworkStore((s) => s.requests)
  const selectRequest = useNetworkStore((s) => s.selectRequest)
  const consoleEntries = useConsoleStore((s) => s.entries)
  const setConsoleFilter = useConsoleStore((s) => s.setFilter)
  const snapshots = usePerfStore((s) => s.snapshots)
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  const [hover, setHover] = useState<TimelineEvent | null>(null)

  const laid = useMemo(() => {
    const events = buildEvents(requests, consoleEntries, snapshots)
    return layoutTimeline(events, timelineWindow(events))
  }, [requests, consoleEntries, snapshots])

  const byLane = useMemo(() => {
    const m: Record<TimelineKind, TimelineEvent[]> = { network: [], console: [], perf: [] }
    for (const e of laid) m[e.kind].push(e)
    return m
  }, [laid])

  const onClick = (e: TimelineEvent) => {
    if (e.kind === 'network') {
      const req = requests.find((r) => r.id === e.refId)
      if (req) {
        selectRequest(req)
        setActiveTab('network')
      }
    } else if (e.kind === 'console') {
      const entry = consoleEntries.find((c) => c.id === e.refId)
      if (entry) {
        setConsoleFilter({ search: entry.message.slice(0, 40) })
        setActiveTab('console')
      }
    } else {
      setActiveTab('performance')
    }
  }

  if (laid.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Nothing captured yet. Network, console, and perf events will align here on one time axis.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Unified Timeline</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          One axis for network · console · perf. Click any marker to cross-filter into its tab.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {LANES.map((lane) => (
          <div key={lane.kind}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{lane.label}</span>
              <span className="text-[10px] text-gray-400">{byLane[lane.kind].length}</span>
            </div>
            <div className="relative h-8 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              {byLane[lane.kind].map((e) => (
                <button
                  key={e.id}
                  onClick={() => onClick(e)}
                  onMouseEnter={() => setHover(e)}
                  onMouseLeave={() => setHover((h) => (h?.id === e.id ? null : h))}
                  title={e.label}
                  style={{ left: `${e.offset * 100}%` }}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${DOT[e.severity]} hover:scale-150 transition-transform`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hover && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 text-xs font-mono text-gray-700 dark:text-gray-300">
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${DOT[hover.severity]}`} />
          {new Date(hover.timestamp).toLocaleTimeString()} — {hover.label}
        </div>
      )}
    </div>
  )
}
