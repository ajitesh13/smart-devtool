import { type FC, useState } from 'react'
import { analyzePattern, type AnalysisKind } from '../../lib/anthropic-client'
import { useNetworkStore } from '../../store/network.store'
import { useConsoleStore } from '../../store/console.store'
import { usePerfStore } from '../../store/perf.store'

const KINDS: { kind: AnalysisKind; label: string; hint: string }[] = [
  { kind: 'leak', label: 'Explain leak', hint: 'Diagnose heap/DOM/listener growth' },
  { kind: 'waterfall', label: 'Explain waterfall', hint: 'Find serial/slow requests' },
  { kind: 'errors', label: 'Explain errors', hint: 'Correlate console + network failures' },
]

export const AIAnalysisPanel: FC = () => {
  const requests = useNetworkStore((s) => s.requests)
  const consoleEntries = useConsoleStore((s) => s.entries)
  const snapshots = usePerfStore((s) => s.snapshots)

  const [output, setOutput] = useState('')
  const [running, setRunning] = useState<AnalysisKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (kind: AnalysisKind) => {
    setError(null)
    setOutput('')
    setRunning(kind)
    try {
      const gen = analyzePattern(kind, requests, consoleEntries, snapshots, (chunk) =>
        setOutput((prev) => prev + chunk)
      )
      for await (const _ of gen) void _
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Analysis</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Opt-in, key-gated. Sends a metadata-only summary (never request/response bodies) to Claude.
        </p>
      </div>

      <div className="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => run(k.kind)}
            disabled={running !== null}
            title={k.hint}
            className="px-3 py-1.5 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {running === k.kind ? 'Analyzing…' : k.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</div>
        )}
        {output ? (
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
            {output}
          </pre>
        ) : (
          !error && (
            <div className="text-sm text-gray-400 text-center mt-12">
              Pick an analysis above. Requires an Anthropic API key in Settings.
            </div>
          )
        )}
      </div>
    </div>
  )
}
