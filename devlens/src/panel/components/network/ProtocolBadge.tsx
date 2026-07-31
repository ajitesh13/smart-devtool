import type { FC } from 'react'
import type { NetworkRequest } from '../../../shared/types'

const COLORS: Record<NetworkRequest['protocol'], string> = {
  XHR: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Fetch: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  WS: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  SSE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

interface Props {
  protocol: NetworkRequest['protocol']
}

export const ProtocolBadge: FC<Props> = ({ protocol }) => (
  <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${COLORS[protocol]}`}>
    {protocol}
  </span>
)
