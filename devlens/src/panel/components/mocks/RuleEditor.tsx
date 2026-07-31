import { type FC } from 'react'
import type { MockRule } from '../../../shared/types'

interface Props {
  rule: MockRule
  onChange: (rule: MockRule) => void
  onRemove: () => void
  onToggle: () => void
}

const FAIL_REASONS = ['', 'Failed', 'TimedOut', 'ConnectionRefused', 'ConnectionReset', 'AccessDenied']

const inputCls =
  'px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100'

export const RuleEditor: FC<Props> = ({ rule, onChange, onRemove, onToggle }) => {
  const set = (patch: Partial<MockRule>) => onChange({ ...rule, ...patch })

  return (
    <div
      className={`rounded border p-3 space-y-2 ${
        rule.enabled
          ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
          : 'border-gray-200 dark:border-gray-700 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={rule.enabled} onChange={onToggle} title="Enable rule" />
        <input
          value={rule.urlPattern}
          onChange={(e) => set({ urlPattern: e.target.value })}
          placeholder="URL pattern (substring or regex)"
          className={`${inputCls} flex-1 min-w-0 font-mono`}
        />
        <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <input
            type="checkbox"
            checked={rule.isRegex ?? false}
            onChange={(e) => set({ isRegex: e.target.checked })}
          />
          regex
        </label>
        <button
          onClick={onRemove}
          className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-950 shrink-0"
        >
          Delete
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center text-xs">
        <select
          value={rule.method ?? ''}
          onChange={(e) => set({ method: e.target.value || undefined })}
          className={inputCls}
        >
          <option value="">any method</option>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1 text-gray-500">
          status
          <input
            type="number"
            value={rule.status ?? ''}
            onChange={(e) => set({ status: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="—"
            className={`${inputCls} w-16`}
          />
        </label>

        <label className="flex items-center gap-1 text-gray-500">
          delay
          <input
            type="number"
            value={rule.delayMs ?? ''}
            onChange={(e) => set({ delayMs: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0"
            className={`${inputCls} w-16`}
          />
          ms
        </label>

        <label className="flex items-center gap-1 text-gray-500">
          fail
          <select
            value={rule.failReason ?? ''}
            onChange={(e) => set({ failReason: e.target.value || undefined })}
            className={inputCls}
          >
            {FAIL_REASONS.map((r) => (
              <option key={r} value={r}>
                {r || 'no'}
              </option>
            ))}
          </select>
        </label>

        <input
          value={rule.contentType ?? ''}
          onChange={(e) => set({ contentType: e.target.value || undefined })}
          placeholder="content-type"
          className={`${inputCls} flex-1 min-w-[8rem] font-mono`}
        />
      </div>

      {!rule.failReason && (
        <textarea
          value={rule.body ?? ''}
          onChange={(e) => set({ body: e.target.value || undefined })}
          placeholder="Response body (leave empty to keep original). JSON is served as-is."
          rows={3}
          className={`${inputCls} w-full font-mono resize-y`}
        />
      )}
    </div>
  )
}
