import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, readFile, utimes } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { SnapshotStorage } from '../src/snapshot-storage.js'
import type { ApiSnapshot } from '../src/types.js'

function snapshot(name: string, timestamp: string, data: unknown = { ok: true }): ApiSnapshot {
  return {
    endpoint: { name, url: `http://localhost/${name}`, method: 'GET' },
    timestamp,
    response: { status: 200, headers: { 'content-type': 'application/json' }, data, duration: 3 },
    metadata: { version: '1.0.0', environment: 'test' }
  }
}

describe('SnapshotStorage', () => {
  let dir: string
  let storage: SnapshotStorage

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'api-snapshot-storage-'))
    storage = new SnapshotStorage(dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('saves a snapshot under a name built from endpoint and timestamp, and loads it back', async () => {
    const original = snapshot('users', '2025-06-01T12:34:56.789Z', { list: [1, 2] })

    const filePath = await storage.saveSnapshot(original)

    expect(filePath).toBe(join(dir, 'users_2025-06-01_12-34-56.json'))
    expect(JSON.parse(await readFile(filePath, 'utf-8'))).toEqual(original)
    expect(await storage.loadSnapshot(filePath)).toEqual(original)
  })

  it('throws when loading a snapshot file that does not exist', async () => {
    await expect(storage.loadSnapshot(join(dir, 'missing.json'))).rejects.toThrow('Snapshot file not found')
  })

  it('saves and loads a baseline in <snapshotDir>/baseline by default', async () => {
    const original = snapshot('users', '2025-06-01T00:00:00.000Z')

    const filePath = await storage.saveBaseline(original)

    expect(filePath).toBe(join(dir, 'baseline', 'users.json'))
    expect(await storage.loadBaseline('users')).toEqual(original)
  })

  it('saves and loads a baseline in an explicit baseline directory', async () => {
    const baselineDir = join(dir, 'custom-baselines')
    const original = snapshot('users', '2025-06-01T00:00:00.000Z')

    await storage.saveBaseline(original, baselineDir)

    expect(await readdir(baselineDir)).toEqual(['users.json'])
    expect(await storage.loadBaseline('users', baselineDir)).toEqual(original)
    expect(await storage.loadBaseline('users')).toBeNull()
  })

  it('overwrites the previous baseline for the same endpoint', async () => {
    await storage.saveBaseline(snapshot('users', '2025-06-01T00:00:00.000Z', { v: 1 }))
    await storage.saveBaseline(snapshot('users', '2025-06-02T00:00:00.000Z', { v: 2 }))

    expect((await storage.loadBaseline('users'))?.response.data).toEqual({ v: 2 })
  })

  it('returns null for a missing baseline', async () => {
    expect(await storage.loadBaseline('nope')).toBeNull()
  })

  describe('listing and cleanup', () => {
    async function saveAt(name: string, timestamp: string, mtimeSeconds: number): Promise<string> {
      const filePath = await storage.saveSnapshot(snapshot(name, timestamp))
      await utimes(filePath, mtimeSeconds, mtimeSeconds)
      return filePath
    }

    it('returns an empty list when the directory does not exist', async () => {
      expect(await new SnapshotStorage(join(dir, 'missing')).listSnapshots()).toEqual([])
    })

    it('lists snapshots newest first and filters by endpoint', async () => {
      const older = await saveAt('users', '2025-06-01T00:00:00.000Z', 1_000)
      const newer = await saveAt('users', '2025-06-02T00:00:00.000Z', 2_000)
      const posts = await saveAt('posts', '2025-06-03T00:00:00.000Z', 3_000)

      expect(await storage.listSnapshots()).toEqual([posts, newer, older])
      expect(await storage.listSnapshots('users')).toEqual([newer, older])
      expect((await storage.getLatestSnapshot('users'))?.timestamp).toBe('2025-06-02T00:00:00.000Z')
      expect(await storage.getLatestSnapshot('none')).toBeNull()
    })

    it('does not mix up endpoints whose names share a suffix or prefix', async () => {
      const users = await saveAt('users', '2025-06-01T00:00:00.000Z', 1_000)
      await saveAt('admin-users', '2025-06-02T00:00:00.000Z', 2_000)
      await saveAt('users_v2', '2025-06-03T00:00:00.000Z', 3_000)

      expect(await storage.listSnapshots('users')).toEqual([users])
    })

    it('keeps only the newest snapshots of an endpoint on cleanup', async () => {
      await saveAt('users', '2025-06-01T00:00:00.000Z', 1_000)
      await saveAt('users', '2025-06-02T00:00:00.000Z', 2_000)
      const newest = await saveAt('users', '2025-06-03T00:00:00.000Z', 3_000)
      const posts = await saveAt('posts', '2025-06-01T00:00:00.000Z', 500)

      expect(await storage.cleanupOldSnapshots('users', 1)).toBe(2)
      expect(await storage.listSnapshots()).toEqual([newest, posts])
      expect(await storage.cleanupOldSnapshots('users', 1)).toBe(0)
    })
  })
})
