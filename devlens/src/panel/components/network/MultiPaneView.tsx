import type { FC } from 'react'
import { useViewStore, ALL_PROTOCOLS } from '../../store/view.store'
import { useNetworkStore } from '../../store/network.store'
import { NetworkPane } from './NetworkPane'
import { RequestDetail } from './RequestDetail'

export const MultiPaneView: FC = () => {
  const { mode, singlePane, panes, setMode, togglePaneProtocol, isCapturingControls } = useViewControls()
  const selected = useNetworkStore((s) => s.selected)

  const activePanes = mode === 'single' ? [singlePane] : panes

  return (
    <div className="flex flex-col h-full">
      {/* View mode + protocol pane selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs">
        <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setMode('single')}
            className={`px-2 py-1 ${mode === 'single' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-2 py-1 ${mode === 'split' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
          >
            Split
          </button>
        </div>

        {mode === 'split' && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">panes:</span>
            {ALL_PROTOCOLS.map((p) => {
              const active = panes.some((pane) => pane.protocol === p)
              return (
                <button
                  key={p}
                  onClick={() => togglePaneProtocol(p)}
                  className={`px-2 py-0.5 rounded font-mono ${
                    active ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        )}

        {isCapturingControls}
      </div>

      {/* Panes + detail */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-1 overflow-hidden ${selected ? 'max-w-[60%]' : ''}`}>
          {activePanes.length === 0 ? (
            <div className="flex items-center justify-center w-full text-xs text-gray-400">
              Select at least one protocol pane.
            </div>
          ) : (
            activePanes.map((pane) => (
              <div key={pane.id} className="flex-1 min-w-0 overflow-hidden">
                <NetworkPane pane={pane} />
              </div>
            ))
          )}
        </div>

        {selected && (
          <div className="w-[40%] overflow-hidden">
            <RequestDetail request={selected} />
          </div>
        )}
      </div>
    </div>
  )
}

// Capture/clear controls + view store wiring
function useViewControls() {
  const view = useViewStore()
  const { isCapturing, setCapturing, clearRequests } = useNetworkStore()

  const isCapturingControls = (
    <div className="flex items-center gap-2 ml-auto">
      <button
        onClick={() => setCapturing(!isCapturing)}
        className={`px-2 py-1 rounded font-medium ${
          isCapturing ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        {isCapturing ? '⏹ Stop' : '⏺ Record'}
      </button>
      <button
        onClick={clearRequests}
        className="px-2 py-1 rounded font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        Clear
      </button>
    </div>
  )

  return { ...view, isCapturingControls }
}
