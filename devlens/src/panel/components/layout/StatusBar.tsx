import type { FC } from 'react'
import { useNetworkStore } from '../../store/network.store'

interface Props {
  mcpConnected: boolean
}

export const StatusBar: FC<Props> = ({ mcpConnected }) => {
  const { requests, isCapturing } = useNetworkStore()

  return (
    <div className="flex items-center gap-4 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        {isCapturing ? 'Capturing' : 'Paused'}
      </span>
      <span>{requests.length} requests</span>
      <span className="ml-auto flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${mcpConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        Claude Code {mcpConnected ? 'connected' : 'disconnected'}
      </span>
    </div>
  )
}
