import type { GraphQLType } from './types'

export interface GraphQLInfo {
  operation: string
  type: GraphQLType
}

/**
 * Detect a GraphQL operation from a request body string.
 * Handles single and batched (array) operations. Pure + testable.
 * Returns null when the body isn't a recognizable GraphQL request.
 */
export function parseGraphQL(body: string | undefined): GraphQLInfo | null {
  if (!body) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return null
  }
  const first = Array.isArray(parsed) ? parsed[0] : parsed
  if (!first || typeof first !== 'object') return null
  const obj = first as Record<string, unknown>
  const query = obj['query']
  if (typeof query !== 'string') return null

  const type = detectType(query)
  const explicit = typeof obj['operationName'] === 'string' ? (obj['operationName'] as string) : ''
  const operation = explicit || extractOperationName(query) || '(anonymous)'
  return { operation, type }
}

function detectType(query: string): GraphQLType {
  const m = /\b(query|mutation|subscription)\b/.exec(query.trimStart())
  if (m) return m[1] as GraphQLType
  // Shorthand `{ ... }` with no keyword is a query.
  return 'query'
}

/** Pull the operation name out of `query Foo(...) {` / `mutation Bar {`. */
export function extractOperationName(query: string): string | null {
  const m = /\b(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(query)
  return m ? m[1] : null
}
