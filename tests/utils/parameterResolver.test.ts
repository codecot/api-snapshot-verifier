import { describe, it, expect } from 'vitest'
import { resolveEndpointParameters } from '../../src/utils/parameterResolver.js'

const templateEndpoint = {
  name: 'User Details',
  url: 'https://api.example.com/users/{userId}?token={token}',
  method: 'GET' as const,
  headers: {
    Authorization: 'Bearer {token}',
    'X-User': '{userId}'
  },
  body: {
    query: '{search}',
    nested: { id: '{userId}' }
  },
  parameters: {
    userId: '123',
    token: 'abcd',
    search: 'find'
  }
}

describe('resolveEndpointParameters', () => {
  it('replaces placeholders in url, headers and body', () => {
    const resolved = resolveEndpointParameters(templateEndpoint)

    expect(resolved.url).toBe('https://api.example.com/users/123?token=abcd')
    expect(resolved.headers).toEqual({
      Authorization: 'Bearer abcd',
      'X-User': '123'
    })
    expect(resolved.body).toEqual({
      query: 'find',
      nested: { id: '123' }
    })
  })
})
