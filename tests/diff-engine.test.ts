import { describe, it, expect } from 'vitest'
import { DiffEngine } from '../src/diff-engine.js'
import type { ApiSnapshot, DiffRule, SnapshotDiff } from '../src/types.js'

function snapshot(
  data: unknown,
  overrides: { status?: number; headers?: Record<string, string> } = {}
): ApiSnapshot {
  return {
    endpoint: { name: 'users', url: 'http://localhost/users', method: 'GET' },
    timestamp: '2025-06-01T00:00:00.000Z',
    response: {
      status: overrides.status ?? 200,
      headers: overrides.headers ?? { 'content-type': 'application/json' },
      data,
      duration: 1
    },
    metadata: { version: '1.0.0' }
  }
}

function diff(oldData: unknown, newData: unknown, rules: DiffRule[] = []): SnapshotDiff[] {
  return new DiffEngine(rules).compareSnapshots(snapshot(oldData), snapshot(newData)).differences
}

describe('DiffEngine.compareSnapshots', () => {
  it('reports no changes for identical snapshots', () => {
    const data = { name: 'Ada', tags: ['a', 'b'], nested: { ok: true } }
    const result = new DiffEngine().compareSnapshots(snapshot(data), snapshot(structuredClone(data)))

    expect(result.endpoint).toBe('users')
    expect(result.hasChanges).toBe(false)
    expect(result.differences).toEqual([])
  })

  it('classifies a type change as breaking', () => {
    expect(diff({ count: 1 }, { count: '1' })).toEqual([
      { path: 'response.data.count', type: 'changed', oldValue: 1, newValue: '1', severity: 'breaking' }
    ])
  })

  it('classifies a removed field as breaking', () => {
    expect(diff({ name: 'Ada', email: 'a@x' }, { name: 'Ada' })).toEqual([
      { path: 'response.data.email', type: 'removed', oldValue: 'a@x', severity: 'breaking' }
    ])
  })

  it('classifies an added field as non-breaking', () => {
    expect(diff({ name: 'Ada' }, { name: 'Ada', age: 36 })).toEqual([
      { path: 'response.data.age', type: 'added', newValue: 36, severity: 'non-breaking' }
    ])
  })

  it('classifies a changed value of the same type as non-breaking', () => {
    expect(diff({ name: 'Ada' }, { name: 'Grace' })).toEqual([
      { path: 'response.data.name', type: 'changed', oldValue: 'Ada', newValue: 'Grace', severity: 'non-breaking' }
    ])
  })

  it('classifies a changed id value as breaking', () => {
    const severities = (key: string) => diff({ [key]: 1 }, { [key]: 2 })[0].severity

    expect(severities('id')).toBe('breaking')
    expect(severities('userId')).toBe('breaking')
    expect(severities('user_id')).toBe('breaking')
  })

  it('does not treat fields that merely contain the letters "id" as ids', () => {
    expect(diff({ width: 100 }, { width: 200 })[0].severity).toBe('non-breaking')
    expect(diff({ provider: 'a' }, { provider: 'b' })[0].severity).toBe('non-breaking')
    expect(diff({ videos: [{ title: 'a' }] }, { videos: [{ title: 'b' }] })[0]).toMatchObject({
      path: 'response.data.videos[0].title',
      severity: 'non-breaking'
    })
  })

  it('classifies null to value and value to null as breaking', () => {
    expect(diff({ name: null }, { name: 'Ada' })[0].severity).toBe('breaking')
    expect(diff({ name: 'Ada' }, { name: null })[0].severity).toBe('breaking')
    expect(diff({ user: null }, { user: { name: 'Ada' } })[0].severity).toBe('breaking')
  })

  it('walks nested objects and reports full paths', () => {
    const oldData = { user: { address: { city: 'Paris', zip: '75001' } } }
    const newData = { user: { address: { city: 'Lyon' }, phone: '123' } }

    expect(diff(oldData, newData)).toEqual([
      { path: 'response.data.user.address.city', type: 'changed', oldValue: 'Paris', newValue: 'Lyon', severity: 'non-breaking' },
      { path: 'response.data.user.address.zip', type: 'removed', oldValue: '75001', severity: 'breaking' },
      { path: 'response.data.user.phone', type: 'added', newValue: '123', severity: 'non-breaking' }
    ])
  })

  it('compares arrays element by element and reports length changes as non-breaking', () => {
    const oldData = { items: [{ name: 'a', price: 1 }, { name: 'b', price: 2 }] }
    const newData = { items: [{ name: 'a', price: '1' }, { name: 'b', price: 2 }, { name: 'c', price: 3 }] }

    expect(diff(oldData, newData)).toEqual([
      { path: 'response.data.items.length', type: 'changed', oldValue: 2, newValue: 3, severity: 'non-breaking' },
      { path: 'response.data.items[0].price', type: 'changed', oldValue: 1, newValue: '1', severity: 'breaking' }
    ])
  })

  it('reports a shorter array only as a length change', () => {
    // Elements beyond the shorter length are not compared individually.
    expect(diff([1, 2, 3], [1])).toEqual([
      { path: 'response.data.length', type: 'changed', oldValue: 3, newValue: 1, severity: 'non-breaking' }
    ])
  })

  it('treats array to object as a breaking type change', () => {
    expect(diff({ items: [] }, { items: {} })).toMatchObject([
      { path: 'response.data.items', severity: 'breaking' }
    ])
  })

  describe('status codes', () => {
    const statusDiff = (from: number, to: number) =>
      new DiffEngine().compareSnapshots(snapshot({}, { status: from }), snapshot({}, { status: to })).differences

    it('2xx to an error status is breaking', () => {
      expect(statusDiff(200, 500)).toEqual([
        { path: 'response.status', type: 'changed', oldValue: 200, newValue: 500, severity: 'breaking' }
      ])
      expect(statusDiff(200, 404)[0].severity).toBe('breaking')
    })

    it('an error status to 2xx is non-breaking', () => {
      expect(statusDiff(500, 200)[0].severity).toBe('non-breaking')
    })

    it('a change within 2xx is informational', () => {
      expect(statusDiff(200, 201)[0].severity).toBe('informational')
    })
  })

  describe('headers', () => {
    const headerDiff = (from: Record<string, string>, to: Record<string, string>) =>
      new DiffEngine().compareSnapshots(snapshot({}, { headers: from }), snapshot({}, { headers: to })).differences

    it('a content-type change is breaking', () => {
      expect(headerDiff({ 'content-type': 'application/json' }, { 'content-type': 'text/html' })).toEqual([
        {
          path: 'response.headers.content-type',
          type: 'changed',
          oldValue: 'application/json',
          newValue: 'text/html',
          severity: 'breaking'
        }
      ])
    })

    it('content-length and cache-control changes are informational', () => {
      const result = headerDiff(
        { 'content-length': '10', 'cache-control': 'no-cache' },
        { 'content-length': '20', 'cache-control': 'max-age=60' }
      )
      expect(result.map(d => [d.path, d.severity])).toEqual([
        ['response.headers.content-length', 'informational'],
        ['response.headers.cache-control', 'informational']
      ])
    })

    it('other headers are not compared', () => {
      expect(headerDiff({ date: 'Mon', 'x-request-id': '1' }, { date: 'Tue', 'x-request-id': '2' })).toEqual([])
    })
  })

  describe('schema validation results', () => {
    it('a response that stops matching its schema is breaking', () => {
      const baseline = snapshot({ id: 1 })
      baseline.response.validation = { isValid: true, errors: [], warnings: [] }
      const current = snapshot({ id: 1 })
      current.response.validation = {
        isValid: false,
        errors: [{ path: 'id', message: 'must be string', severity: 'error' }],
        warnings: []
      }

      const result = new DiffEngine().compareSnapshots(baseline, current).differences
      expect(result.map(d => [d.path, d.severity])).toEqual([
        ['response.validation.isValid', 'breaking'],
        ['response.validation.errors.count', 'breaking'],
        ['response.validation.errors.id', 'breaking']
      ])
    })
  })

  describe('rules', () => {
    it('ignore removes matching differences', () => {
      const result = diff({ name: 'a', updatedAt: '1' }, { name: 'a', updatedAt: '2' }, [
        { path: 'response.data.updatedAt', ignore: true }
      ])
      expect(result).toEqual([])
    })

    it('ignore applies to everything under the rule path', () => {
      const result = diff({ meta: { a: 1, b: 2 } }, { meta: { a: 2 } }, [{ path: 'response.data.meta', ignore: true }])
      expect(result).toEqual([])
    })

    it('severity overrides the default classification', () => {
      const result = diff({ name: 'a', count: 1 }, { name: 'b', count: '1' }, [
        { path: 'response.data.name', severity: 'breaking' },
        { path: 'response.data.count', severity: 'informational' }
      ])
      expect(result.map(d => [d.path, d.severity])).toEqual([
        ['response.data.name', 'breaking'],
        ['response.data.count', 'informational']
      ])
    })

    it('a rule only matches whole path segments', () => {
      const result = diff({ user: 'a', username: 'a' }, { user: 'b', username: 'b' }, [
        { path: 'response.data.user', ignore: true }
      ])
      expect(result.map(d => d.path)).toEqual(['response.data.username'])
    })

    it('"*" matches any single segment, including array indexes', () => {
      const oldData = [{ name: 'a', price: 1 }, { name: 'b', price: 2 }]
      const newData = [{ name: 'a', price: 5 }, { name: 'c', price: 6 }]

      const result = diff(oldData, newData, [{ path: 'response.data.*.price', severity: 'breaking' }])
      expect(result.map(d => [d.path, d.severity])).toEqual([
        ['response.data[0].price', 'breaking'],
        ['response.data[1].name', 'non-breaking'],
        ['response.data[1].price', 'breaking']
      ])
    })

    it('"*" works for object keys and can be ignored', () => {
      const oldData = { users: { a: { lastModified: '1', name: 'x' } } }
      const newData = { users: { a: { lastModified: '2', name: 'x' } } }

      expect(diff(oldData, newData, [{ path: 'response.data.users.*.lastModified', ignore: true }])).toEqual([])
    })

    it('the first matching rule wins', () => {
      const result = diff({ meta: { a: 1 } }, { meta: { a: 2 } }, [
        { path: 'response.data.meta', severity: 'informational' },
        { path: 'response.data.meta.a', ignore: true }
      ])
      expect(result.map(d => [d.path, d.severity])).toEqual([['response.data.meta.a', 'informational']])
    })

    it('rules also apply to header and status differences', () => {
      const result = new DiffEngine([{ path: 'response.headers.content-type', ignore: true }]).compareSnapshots(
        snapshot({}, { headers: { 'content-type': 'a' } }),
        snapshot({}, { headers: { 'content-type': 'b' } })
      )
      expect(result.hasChanges).toBe(false)
    })
  })
})

describe('DiffEngine.generateTextDiff', () => {
  it('marks added and removed lines', () => {
    const text = new DiffEngine().generateTextDiff(snapshot({ a: 1 }), snapshot({ a: 2 }))
    expect(text).toContain('-   "a": 1')
    expect(text).toContain('+   "a": 2')
  })
})
