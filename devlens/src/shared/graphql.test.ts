import { describe, it, expect } from 'vitest'
import { parseGraphQL, extractOperationName } from './graphql'

describe('parseGraphQL', () => {
  it('reads explicit operationName + query type', () => {
    const body = JSON.stringify({ operationName: 'GetUser', query: 'query GetUser { user { id } }' })
    expect(parseGraphQL(body)).toEqual({ operation: 'GetUser', type: 'query' })
  })

  it('infers operation name from the query when operationName missing', () => {
    const body = JSON.stringify({ query: 'mutation UpdateUser($id: ID!) { updateUser(id: $id) { id } }' })
    expect(parseGraphQL(body)).toEqual({ operation: 'UpdateUser', type: 'mutation' })
  })

  it('detects subscriptions', () => {
    const body = JSON.stringify({ query: 'subscription OnMsg { messageAdded { id } }' })
    expect(parseGraphQL(body)).toEqual({ operation: 'OnMsg', type: 'subscription' })
  })

  it('treats shorthand query as anonymous query', () => {
    const body = JSON.stringify({ query: '{ me { id } }' })
    expect(parseGraphQL(body)).toEqual({ operation: '(anonymous)', type: 'query' })
  })

  it('handles batched operations by taking the first', () => {
    const body = JSON.stringify([{ query: 'query A { a }' }, { query: 'query B { b }' }])
    expect(parseGraphQL(body)).toEqual({ operation: 'A', type: 'query' })
  })

  it('returns null for non-GraphQL bodies', () => {
    expect(parseGraphQL(JSON.stringify({ foo: 'bar' }))).toBeNull()
    expect(parseGraphQL('not json')).toBeNull()
    expect(parseGraphQL(undefined)).toBeNull()
  })
})

describe('extractOperationName', () => {
  it('pulls the name after the keyword', () => {
    expect(extractOperationName('query Foo($x: Int) { a }')).toBe('Foo')
    expect(extractOperationName('{ anon }')).toBeNull()
  })
})
