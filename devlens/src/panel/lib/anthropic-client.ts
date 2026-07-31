import Anthropic from '@anthropic-ai/sdk'
import { getConfig } from '../../shared/config'
import type { NetworkRequest, ConsoleEntry, PerfSnapshot } from '../../shared/types'

const MODEL = 'claude-sonnet-4-6'

export type AnalysisKind = 'leak' | 'waterfall' | 'errors'

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

/**
 * Macro-analysis: send a COMPACT, metadata-only summary of the current session
 * (never request/response bodies — see the security invariant) and ask Claude to
 * explain a leak / waterfall / error cluster. Opt-in and key-gated.
 */
export function buildMacroPrompt(
  kind: AnalysisKind,
  requests: NetworkRequest[],
  console: ConsoleEntry[],
  perf: PerfSnapshot[]
): string {
  const perfLine =
    perf.length >= 2
      ? `Heap ${(perf[0].jsHeapUsed / 1e6).toFixed(1)}MB → ${(perf[perf.length - 1].jsHeapUsed / 1e6).toFixed(1)}MB, ` +
        `nodes ${perf[0].nodes} → ${perf[perf.length - 1].nodes}, ` +
        `listeners ${perf[0].jsEventListeners} → ${perf[perf.length - 1].jsEventListeners} over ${perf.length} samples`
      : 'no perf samples'

  const slowest = [...requests]
    .filter((r) => r.timing.duration != null)
    .sort((a, b) => (b.timing.duration ?? 0) - (a.timing.duration ?? 0))
    .slice(0, 15)
    .map((r) => `  ${r.method} ${r.status ?? '-'} ${r.timing.duration}ms ${shortUrl(r.url)}`)
    .join('\n')

  const errs = console
    .filter((c) => c.level === 'error' || c.level === 'warn')
    .slice(-20)
    .map((c) => `  [${c.level}] ${c.message.slice(0, 120)}${c.relatedUrl ? ` (→ ${shortUrl(c.relatedUrl)})` : ''}`)
    .join('\n')

  const intro: Record<AnalysisKind, string> = {
    leak: 'Analyze this session for a possible memory/DOM leak. Explain the trend and name likely culprits.',
    waterfall: 'Analyze this network waterfall. Identify serialization, slow calls, and parallelization opportunities.',
    errors: 'These console errors and network failures may be correlated. Explain the likely root cause chain.',
  }

  return `${intro[kind]}

Perf trend: ${perfLine}

Slowest requests (metadata only, no bodies):
${slowest || '  none'}

Recent console errors/warnings:
${errs || '  none'}

Be concise and technical. Give a diagnosis and 2-3 concrete next steps.`
}

export async function* analyzePattern(
  kind: AnalysisKind,
  requests: NetworkRequest[],
  console: ConsoleEntry[],
  perf: PerfSnapshot[],
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
    messages: [{ role: 'user', content: buildMacroPrompt(kind, requests, console, perf) }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onChunk(event.delta.text)
      yield
    }
  }
}

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url.slice(0, 40)
  }
}
