import { type FC, useMemo } from 'react'
import { usePerfStore, selectLatest } from '../../store/perf.store'
import { cpuPercentBetween } from '../../../shared/perf-metrics'
import { Sparkline } from './Sparkline'
import type { PerfSnapshot } from '../../../shared/types'

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}

/** CPU% series derived from consecutive TaskDuration deltas. */
function cpuSeries(snaps: PerfSnapshot[]): number[] {
  const out: number[] = []
  for (let i = 1; i < snaps.length; i++) out.push(cpuPercentBetween(snaps[i - 1], snaps[i]))
  return out
}

const Vital: FC<{
  label: string
  value: string
  series: number[]
  colorClass?: string
  warn?: boolean
}> = ({ label, value, series, colorClass, warn }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
    <div className="min-w-0">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`text-sm font-mono font-semibold ${warn ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
    </div>
    <Sparkline values={series} colorClass={warn ? 'text-red-500' : colorClass} />
  </div>
)

export const PerformancePanel: FC = () => {
  const snapshots = usePerfStore((s) => s.snapshots)
  const provenance = usePerfStore((s) => s.provenance)
  const detached = usePerfStore((s) => s.detached)
  const isScanning = usePerfStore((s) => s.isScanning)
  const scanError = usePerfStore((s) => s.scanError)
  const latest = usePerfStore(selectLatest)

  const heapSeries = useMemo(() => snapshots.map((s) => s.jsHeapUsed), [snapshots])
  const nodeSeries = useMemo(() => snapshots.map((s) => s.nodes), [snapshots])
  const listenerSeries = useMemo(() => snapshots.map((s) => s.jsEventListeners), [snapshots])
  const cpu = useMemo(() => cpuSeries(snapshots), [snapshots])

  // Heuristic warnings: heap or node count trending sharply up over the window.
  const rising = (arr: number[]): boolean =>
    arr.length >= 10 && arr[arr.length - 1] > arr[0] * 1.5 && arr[arr.length - 1] > arr[0] + 10

  const runProvenance = () => {
    const tabId = chrome.devtools.inspectedWindow.tabId
    chrome.runtime
      .sendMessage({ type: 'COMPUTE_PROVENANCE', tabId })
      .then((res) => usePerfStore.getState().setProvenance(res?.provenance ?? []))
      .catch(() => undefined)
  }

  const runLeakScan = () => {
    const tabId = chrome.devtools.inspectedWindow.tabId
    const store = usePerfStore.getState()
    store.setScanning(true)
    store.setScanError(null)
    chrome.runtime
      .sendMessage({ type: 'SCAN_DETACHED', tabId })
      .then((res) => {
        store.setDetached(res?.detached ?? [])
        if (res?.error) store.setScanError(res.error)
      })
      .catch((err) => store.setScanError(String(err)))
      .finally(() => store.setScanning(false))
  }

  if (!latest) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 px-4 text-center">
        Collecting performance metrics… interact with the page to see activity.
      </div>
    )
  }

  const cpuNow = cpu.length ? cpu[cpu.length - 1] : 0
  const maxSubtree = provenance.length ? provenance[0].nodeCount : 1

  return (
    <div className="flex flex-col h-full overflow-y-auto text-sm">
      {/* Vitals */}
      <section>
        <h3 className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          Live Vitals
        </h3>
        <Vital
          label="JS Heap (used / total)"
          value={`${fmtBytes(latest.jsHeapUsed)} / ${fmtBytes(latest.jsHeapTotal)}`}
          series={heapSeries}
          colorClass="text-purple-500"
          warn={rising(heapSeries)}
        />
        <Vital label="CPU (main thread)" value={`${cpuNow}%`} series={cpu} colorClass="text-orange-500" />
        <Vital
          label="DOM Nodes"
          value={latest.nodes.toLocaleString()}
          series={nodeSeries}
          colorClass="text-blue-500"
          warn={rising(nodeSeries)}
        />
        <Vital
          label="JS Event Listeners"
          value={latest.jsEventListeners.toLocaleString()}
          series={listenerSeries}
          colorClass="text-teal-500"
          warn={rising(listenerSeries)}
        />
        <div className="flex gap-4 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <span>Documents: {latest.documents}</span>
          <span>Frames: {latest.frames}</span>
          <span>Layouts: {latest.layoutCount}</span>
          <span>Style recalcs: {latest.recalcStyleCount}</span>
        </div>
      </section>

      {/* DOM provenance */}
      <section>
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            DOM Provenance — where nodes live
          </h3>
          <button
            onClick={runProvenance}
            className="px-2 py-0.5 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            Snapshot
          </button>
        </div>
        {provenance.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400">
            Click “Snapshot” to attribute DOM nodes to top-level containers.
          </div>
        ) : (
          <div className="py-1">
            {provenance.slice(0, 20).map((s) => (
              <div key={s.label} className="px-3 py-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="truncate mr-2 text-gray-800 dark:text-gray-200">{s.label}</span>
                  <span className="text-gray-500">{s.nodeCount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 mt-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  <div
                    className="h-full bg-blue-500 rounded"
                    style={{ width: `${Math.max(2, (s.nodeCount / maxSubtree) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detached-node leak scan */}
      <section>
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Detached Node Leak Scan
          </h3>
          <button
            onClick={runLeakScan}
            disabled={isScanning}
            className="px-2 py-0.5 text-xs rounded bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white"
          >
            {isScanning ? 'Scanning…' : 'Scan'}
          </button>
        </div>
        {scanError ? (
          <div className="px-3 py-3 text-xs text-red-500">{scanError}</div>
        ) : detached.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400">
            Run a scan to find detached DOM subtrees still retained by JavaScript (memory leaks).
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <th className="px-3 py-1 font-medium">Container</th>
                <th className="px-3 py-1 font-medium text-right">Trees</th>
                <th className="px-3 py-1 font-medium text-right">Retained nodes</th>
              </tr>
            </thead>
            <tbody>
              {detached.map((d) => (
                <tr key={d.description} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="px-3 py-1 font-mono text-gray-800 dark:text-gray-200">{d.description}</td>
                  <td className="px-3 py-1 text-right text-gray-500">{d.count}</td>
                  <td className="px-3 py-1 text-right text-gray-500">{d.retainedSize ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
