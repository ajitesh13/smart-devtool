import { type FC, useMemo, useState } from 'react'
import type { WSFrame } from '../../../shared/types'

interface Props {
  frames: WSFrame[]
}

type Dir = 'all' | 'send' | 'receive'

function tryPretty(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data), null, 2)
  } catch {
    return data
  }
}

function isJson(data: string): boolean {
  try {
    JSON.parse(data)
    return true
  } catch {
    return false
  }
}

const FrameRow: FC<{ frame: WSFrame }> = ({ frame }) => {
  const [expanded, setExpanded] = useState(false)
  const json = isJson(frame.data)
  return (
    <div
      className={`rounded ${
        frame.type === 'send'
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
          : 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300'
      }`}
    >
      <button
        onClick={() => json && setExpanded(!expanded)}
        className="flex gap-2 p-1.5 w-full text-left items-center"
      >
        <span className="shrink-0 font-bold">{frame.type === 'send' ? '↑' : '↓'}</span>
        <span className="text-gray-400 shrink-0">{new Date(frame.timestamp).toLocaleTimeString()}</span>
        <span className={`truncate ${expanded ? 'hidden' : ''}`}>{frame.data}</span>
        {json && <span className="shrink-0 text-gray-400">{expanded ? '▾' : '▸'}</span>}
        <span className="ml-auto shrink-0 text-gray-400">{frame.size}B</span>
      </button>
      {expanded && (
        <pre className="px-3 pb-2 whitespace-pre-wrap break-all">{tryPretty(frame.data)}</pre>
      )}
    </div>
  )
}

export const WebSocketViewer: FC<Props> = ({ frames }) => {
  const [dir, setDir] = useState<Dir>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      frames.filter((f) => {
        if (dir !== 'all' && f.type !== dir) return false
        if (search && !f.data.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [frames, dir, search]
  )

  if (frames.length === 0) {
    return <p className="text-xs text-gray-400 p-3">No frames captured.</p>
  }

  return (
    <div className="flex flex-col gap-1 font-mono text-xs">
      <div className="flex items-center gap-2 pb-1 sticky top-0">
        {(['all', 'send', 'receive'] as Dir[]).map((d) => (
          <button
            key={d}
            onClick={() => setDir(d)}
            className={`px-2 py-0.5 rounded ${
              dir === d ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}
          >
            {d === 'send' ? '↑ sent' : d === 'receive' ? '↓ recv' : 'all'}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter frames…"
          className="flex-1 min-w-0 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        />
        <span className="text-gray-400 shrink-0">{filtered.length}/{frames.length}</span>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-80">
        {filtered.map((frame, i) => (
          <FrameRow key={i} frame={frame} />
        ))}
      </div>
    </div>
  )
}
