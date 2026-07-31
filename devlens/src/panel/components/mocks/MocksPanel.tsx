import { type FC, useEffect } from 'react'
import type { MockRule } from '../../../shared/types'
import { useMocksStore, newRuleId } from '../../store/mocks.store'
import { RuleEditor } from './RuleEditor'

function pushRules(rules: MockRule[]): void {
  const tabId = chrome.devtools.inspectedWindow.tabId
  chrome.runtime.sendMessage({ type: 'SET_MOCK_RULES', tabId, payload: { rules } }).catch(() => undefined)
}

export const MocksPanel: FC = () => {
  const { rules, loaded, setRules, upsert, remove, toggle } = useMocksStore()

  // Load persisted rules once.
  useEffect(() => {
    if (loaded) return
    const tabId = chrome.devtools.inspectedWindow.tabId
    chrome.runtime
      .sendMessage({ type: 'GET_MOCK_RULES', tabId })
      .then((res) => setRules(res?.rules ?? []))
      .catch(() => setRules([]))
  }, [loaded, setRules])

  // Persist + apply whenever rules change (after initial load).
  useEffect(() => {
    if (loaded) pushRules(rules)
  }, [rules, loaded])

  const addRule = () => {
    upsert({ id: newRuleId(rules), enabled: true, urlPattern: '', status: 200, contentType: 'application/json' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Response Mocks & Overrides</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Force status codes, replace bodies, add latency, or fail requests — things native DevTools cannot do.
          </p>
        </div>
        <button
          onClick={addRule}
          className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add rule
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {rules.length === 0 && (
          <div className="text-sm text-gray-400 text-center mt-12">
            No mock rules. Add one to override a response without touching the backend.
          </div>
        )}
        {rules.map((rule) => (
          <RuleEditor
            key={rule.id}
            rule={rule}
            onChange={upsert}
            onRemove={() => remove(rule.id)}
            onToggle={() => toggle(rule.id)}
          />
        ))}
      </div>
    </div>
  )
}
