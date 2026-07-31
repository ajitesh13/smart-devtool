import type { FC } from 'react'

export type TabId = 'network' | 'console' | 'performance' | 'ai' | 'settings'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'network', label: 'Network' },
  { id: 'console', label: 'Console' },
  { id: 'performance', label: 'Performance' },
  { id: 'ai', label: 'AI' },
  { id: 'settings', label: 'Settings' },
]

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
}

export const TabBar: FC<Props> = ({ active, onChange }) => (
  <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          active === tab.id
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ].join(' ')}
      >
        {tab.label}
      </button>
    ))}
  </div>
)
