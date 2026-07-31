import { type FC, useState } from 'react'
import type { FilterSet, FilterRule, FilterField, FilterOp } from '../../lib/query-engine'

const FIELDS: { value: FilterField; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'method', label: 'Method' },
  { value: 'status', label: 'Status' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'reqHeader', label: 'Req Header' },
  { value: 'resHeader', label: 'Res Header' },
  { value: 'reqBody', label: 'Req Body' },
  { value: 'resBody', label: 'Res Body' },
  { value: 'duration', label: 'Duration' },
  { value: 'gqlOp', label: 'GraphQL Op' },
]

const OPS: { value: FilterOp; label: string }[] = [
  { value: 'regex', label: 'regex' },
  { value: 'contains', label: 'contains' },
  { value: 'eq', label: '=' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'range', label: 'range' },
]

interface Props {
  filterSet: FilterSet
  onChange: (filterSet: FilterSet) => void
  onSave?: (filterSet: FilterSet) => void
}

export const FilterBuilder: FC<Props> = ({ filterSet, onChange, onSave }) => {
  const [open, setOpen] = useState(false)

  const addRule = () => {
    const rule: FilterRule = { field: 'url', op: 'regex', value: '' }
    onChange({ ...filterSet, rules: [...filterSet.rules, rule] })
  }

  const updateRule = (idx: number, updates: Partial<FilterRule>) => {
    const rules = filterSet.rules.map((r, i) => (i === idx ? { ...r, ...updates } : r))
    onChange({ ...filterSet, rules })
  }

  const removeRule = (idx: number) => {
    onChange({ ...filterSet, rules: filterSet.rules.filter((_, i) => i !== idx) })
  }

  const activeCount = filterSet.rules.filter((r) => r.value).length

  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2 py-0.5 rounded font-medium ${
          activeCount > 0
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        ⚙ Filter{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg w-96 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Match</span>
            <select
              value={filterSet.combinator}
              onChange={(e) => onChange({ ...filterSet, combinator: e.target.value as 'AND' | 'OR' })}
              className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            >
              <option value="AND">ALL (AND)</option>
              <option value="OR">ANY (OR)</option>
            </select>
            <span className="text-gray-500">of:</span>
          </div>

          {filterSet.rules.map((rule, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <button
                onClick={() => updateRule(idx, { negate: !rule.negate })}
                className={`px-1 py-0.5 rounded font-mono ${
                  rule.negate ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
                title="Negate"
              >
                NOT
              </button>
              <select
                value={rule.field}
                onChange={(e) => updateRule(idx, { field: e.target.value as FilterField })}
                className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select
                value={rule.op}
                onChange={(e) => updateRule(idx, { op: e.target.value as FilterOp })}
                className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                value={rule.value}
                onChange={(e) => updateRule(idx, { value: e.target.value })}
                placeholder={rule.op === 'range' ? '400-599' : 'value'}
                className="flex-1 min-w-0 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 font-mono"
              />
              <button onClick={() => removeRule(idx)} className="text-gray-400 hover:text-red-500 px-1">✕</button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button onClick={addRule} className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              + Rule
            </button>
            {onSave && (
              <button
                onClick={() => onSave(filterSet)}
                className="px-2 py-0.5 rounded bg-green-500 text-white"
              >
                Save Set
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
