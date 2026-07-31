import type { FC } from 'react'
import type { WSFrame } from '../../../shared/types'

interface Props {
  frames: WSFrame[]
}

export const WebSocketViewer: FC<Props> = ({ frames }) => {
  if (frames.length === 0) {
    return <p className="text-xs text-gray-400 p-3">No frames captured.</p>
  }

  return (
    <div className="flex flex-col gap-1 p-2 font-mono text-xs overflow-y-auto max-h-64">
      {frames.map((frame, i) => (
        <div
          key={i}
          className={`flex gap-2 p-1.5 rounded ${
            frame.type === 'send'
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
              : 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300'
          }`}
        >
          <span className="shrink-0 font-bold">{frame.type === 'send' ? '↑' : '↓'}</span>
          <span className="truncate">{frame.data}</span>
          <span className="ml-auto shrink-0 text-gray-400">{frame.size}B</span>
        </div>
      ))}
    </div>
  )
}
