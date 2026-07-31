import { type FC, useMemo, useState } from 'react'
import type { SSEEvent } from '../../../shared/types'

interface Props {
  events: SSEEvent[]
}

function tryPretty(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data), null, 2)
  } catch {
    return data
  }
}

export const SSEViewer: FC<Props> = ({ events }) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (!search) return true
        const hay = `${e.eventName ?? ''} ${e.data}`.toLowerCase()
        return hay.includes(search.toLowerCase())
      }),
    [events, search]
  )

  if (events.length === 0) {
    return <p className="text-xs text-gray-400 p-3">No SSE events captured yet.</p>
  }

  return (
    <div className="flex flex-col gap-1 font-mono text-xs">
      <div className="flex items-center gap-2 pb-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter events…"
          className="flex-1 min-w-0 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        />
        <span className="text-gray-400 shrink-0">{filtered.length}/{events.length}</span>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-80">
        {filtered.map((e, i) => (
          <div key={i} className="rounded bg-purple-50 dark:bg-purple-950/40 p-1.5">
            <div className="flex gap-2 items-center text-gray-500">
              <span className="font-bold text-purple-700 dark:text-purple-300">
                {e.eventName || 'message'}
              </span>
              {e.eventId && <span>id={e.eventId}</span>}
              <span className="ml-auto">{new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200 mt-0.5">
              {tryPretty(e.data)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
