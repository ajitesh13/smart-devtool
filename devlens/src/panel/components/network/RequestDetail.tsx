import type { FC } from 'react'
import { useState } from 'react'
import type { NetworkRequest } from '../../../shared/types'
import { WebSocketViewer } from './WebSocketViewer'
import { SSEViewer } from './SSEViewer'

type DetailTab = 'headers' | 'body' | 'frames' | 'events' | 'timing'

interface Props {
  request: NetworkRequest
}

export const RequestDetail: FC<Props> = ({ request }) => {
  const [tab, setTab] = useState<DetailTab>('headers')

  const tabs: { id: DetailTab; label: string; hidden?: boolean }[] = [
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'frames', label: 'Frames', hidden: request.protocol !== 'WS' },
    { id: 'events', label: 'Events', hidden: request.protocol !== 'SSE' },
    { id: 'timing', label: 'Timing' },
  ]

  return (
    <div className="flex flex-col h-full text-sm border-l border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <span className="font-mono text-xs truncate text-gray-700 dark:text-gray-300 max-w-xs">
          {request.method} {new URL(request.url).pathname}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {request.graphqlOperation && (
            <span className="px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 text-[10px] font-medium">
              {request.graphqlType} {request.graphqlOperation}
            </span>
          )}
          {request.wsState && (
            <span className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px]">
              WS {request.wsState}
            </span>
          )}
          {request.mocked && (
            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 text-[10px] font-semibold">
              MOCKED
            </span>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        {tabs.filter((t) => !t.hidden).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-950 font-mono text-xs">
        {tab === 'headers' && (
          <div className="space-y-3">
            <section>
              <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Request Headers</h4>
              {Object.entries(request.requestHeaders).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}:</span>
                  <span className="text-gray-800 dark:text-gray-200 break-all">{v}</span>
                </div>
              ))}
            </section>
            <section>
              <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Response Headers</h4>
              {Object.entries(request.responseHeaders).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 dark:text-gray-400 shrink-0">{k}:</span>
                  <span className="text-gray-800 dark:text-gray-200 break-all">{v}</span>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'body' && (
          <div className="space-y-3">
            {request.requestBody && (
              <section>
                <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Request Body</h4>
                <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
                  {tryPrettyJson(request.requestBody)}
                </pre>
              </section>
            )}
            {request.responseBody && (
              <section>
                <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Response Body</h4>
                <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">
                  {tryPrettyJson(request.responseBody)}
                </pre>
              </section>
            )}
            {!request.requestBody && !request.responseBody && (
              <p className="text-gray-400">No body captured.</p>
            )}
          </div>
        )}

        {tab === 'frames' && (
          <WebSocketViewer frames={request.wsFrames ?? []} />
        )}

        {tab === 'events' && (
          <SSEViewer events={request.sseEvents ?? []} />
        )}

        {tab === 'timing' && (
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-gray-500 dark:text-gray-400">Start:</span>
              <span>{new Date(request.timing.start).toISOString()}</span>
            </div>
            {request.timing.end && (
              <div className="flex gap-2">
                <span className="text-gray-500 dark:text-gray-400">End:</span>
                <span>{new Date(request.timing.end).toISOString()}</span>
              </div>
            )}
            {request.timing.duration && (
              <div className="flex gap-2">
                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                <span className="font-semibold">{request.timing.duration}ms</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function tryPrettyJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}
