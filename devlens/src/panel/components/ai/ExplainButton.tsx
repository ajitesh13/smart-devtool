import type { FC } from 'react'
import type { NetworkRequest } from '../../../shared/types'
import { useAIStore } from '../../store/ai.store'
import { explainRequest } from '../../lib/anthropic-client'

interface Props {
  request: NetworkRequest
}

export const ExplainButton: FC<Props> = ({ request }) => {
  const { openDrawer, addMessage, appendToLastMessage, setLoading } = useAIStore()

  const handleExplain = async () => {
    openDrawer(request.id)
    setLoading(true)
    addMessage({ role: 'user', content: `Explain: ${request.method} ${request.url}`, timestamp: Date.now() })
    addMessage({ role: 'assistant', content: '', timestamp: Date.now() })

    try {
      for await (const _ of explainRequest(request, (chunk) => appendToLastMessage(chunk))) {
        // streaming via callback
      }
    } catch (err) {
      appendToLastMessage(`\n\n[Error: ${String(err)}]`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExplain}
      className="px-2 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
      title="Explain with AI"
    >
      ✦ Explain
    </button>
  )
}
