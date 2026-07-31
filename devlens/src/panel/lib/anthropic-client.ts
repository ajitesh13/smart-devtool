import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '../../shared/config'
import type { NetworkRequest } from '../../shared/types'

const MODEL = 'claude-sonnet-4-6'

function buildNetworkPrompt(request: NetworkRequest): string {
  return `Explain this network request for a developer:

URL: ${request.url}
Method: ${request.method}
Protocol: ${request.protocol}
Status: ${request.status ?? 'pending'} ${request.statusText ?? ''}
Duration: ${request.timing.duration != null ? `${request.timing.duration}ms` : 'unknown'}

Request Headers:
${Object.entries(request.requestHeaders).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Response Headers:
${Object.entries(request.responseHeaders).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Explain what this request does, what the response means, and flag any potential issues (CORS, auth errors, slow performance, etc.). Be concise and technical.`
}

export async function* explainRequest(
  request: NetworkRequest,
  onChunk: (chunk: string) => void
): AsyncGenerator<void> {
  const config = await getConfig()
  if (!config.anthropicApiKey) {
    throw new Error('API key not set. Configure it in DevLens Settings.')
  }

  const client = new Anthropic({ apiKey: config.anthropicApiKey, dangerouslyAllowBrowser: true })

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildNetworkPrompt(request) }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text)
      yield
    }
  }
}
