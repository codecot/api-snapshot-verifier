import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { ConfigManager } from '../src/config.js'

describe('ConfigManager.loadConfig', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'api-snapshot-config-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function write(config: unknown): Promise<string> {
    const path = join(dir, 'config.json')
    await writeFile(path, JSON.stringify(config))
    return path
  }

  it('loads a minimal valid config', async () => {
    const config = {
      endpoints: [{ name: 'users', url: 'http://localhost/users', method: 'GET' }],
      snapshotDir: './snapshots',
      rules: [{ path: 'response.data.*.updatedAt', ignore: true }]
    }

    expect(new ConfigManager().loadConfig(await write(config))).toEqual(config)
  })

  it('rejects a missing file', () => {
    expect(() => new ConfigManager().loadConfig(join(dir, 'nope.json'))).toThrow('Config file not found')
  })

  it('rejects a config without an endpoints array', async () => {
    const path = await write({ snapshotDir: './snapshots' })
    expect(() => new ConfigManager().loadConfig(path)).toThrow('Config must have an endpoints array')
  })

  it('rejects a config without snapshotDir', async () => {
    const path = await write({ endpoints: [] })
    expect(() => new ConfigManager().loadConfig(path)).toThrow('Config must specify snapshotDir')
  })

  it('rejects an endpoint without name, url or method', async () => {
    const path = await write({ endpoints: [{ name: 'x', url: 'http://localhost' }], snapshotDir: './s' })
    expect(() => new ConfigManager().loadConfig(path)).toThrow('Each endpoint must have name, url, and method')
  })
})
