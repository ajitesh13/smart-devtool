import type { FC } from 'react'
import { useAIStore } from '../../store/ai.store'

export const AIDrawer: FC = () => {
  const { isOpen, isLoading, messages, closeDrawer } = useAIStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-2xl z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-blue-500 font-bold text-lg">✦</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">AI Explanation</span>
        </div>
        <button
          onClick={closeDrawer}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-full text-sm rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-1 items-center text-gray-400 text-sm">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
          </div>
        )}
      </div>
    </div>
  )
}
