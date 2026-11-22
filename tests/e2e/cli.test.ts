import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { execFile } from 'child_process'
import { mkdtemp, rm, writeFile, readFile, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { createRequire } from 'module'

// End-to-end: run the real CLI (src/cli.ts through tsx) against an HTTP server
// started inside the test. No network access beyond 127.0.0.1.

const repoRoot = resolve(__dirname, '../..')
const cliEntry = join(repoRoot, 'src/cli.ts')
const tsxCli = join(createRequire(import.meta.url).resolve('tsx/package.json'), '../dist/cli.mjs')

interface CliResult {
  code: number
  stdout: string
  stderr: string
}

function runCli(args: string[], cwd: string): Promise<CliResult> {
  return new Promise(resolvePromise => {
    execFile(
      process.execPath,
      [tsxCli, cliEntry, ...args],
      { cwd, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, timeout: 30_000 },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        resolvePromise({ code, stdout, stderr })
      }
    )
  })
}

describe('api-snapshot CLI end to end', () => {
  let server: Server
  let workDir: string
  let responseBody: unknown = { id: 1, name: 'Ada', count: 5 }

  beforeAll(async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(responseBody))
    })
    await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo

    workDir = await mkdtemp(join(tmpdir(), 'api-snapshot-e2e-'))
    const config = {
      endpoints: [{ name: 'user', url: `http://127.0.0.1:${port}/user`, method: 'GET' }],
      snapshotDir: './snapshots',
      baselineDir: './snapshots/baseline'
    }
    await writeFile(join(workDir, 'api-snapshot.config.json'), JSON.stringify(config, null, 2))
  })

  afterAll(async () => {
    await new Promise(done => server.close(done))
    await rm(workDir, { recursive: true, force: true })
  })

  it('fails compare with exit code 1 when no baseline exists', async () => {
    const result = await runCli(['compare'], workDir)

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('No baseline found for endpoint: user')
  })

  it('captures a baseline', async () => {
    const result = await runCli(['capture', '--baseline'], workDir)

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Captured 1 snapshot(s)')
    expect(result.stdout).toContain('Saved as baseline')

    const baseline = JSON.parse(await readFile(join(workDir, 'snapshots/baseline/user.json'), 'utf-8'))
    expect(baseline.response.status).toBe(200)
    expect(baseline.response.data).toEqual({ id: 1, name: 'Ada', count: 5 })
    expect((await readdir(join(workDir, 'snapshots'))).filter(f => f.startsWith('user_'))).toHaveLength(1)
  })

  it('reports no changes and exits 0 when the response is unchanged', async () => {
    const result = await runCli(['compare'], workDir)

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('No changes detected')
  })

  it('reports a changed string value as non-breaking and exits 0', async () => {
    responseBody = { id: 1, name: 'Grace', count: 5 }

    const result = await runCli(['compare', '--details'], workDir)

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('1 non-breaking change(s)')
    expect(result.stdout).toContain('response.data.name: changed')
    expect(result.stdout).not.toMatch(/\d+ breaking change/)
    expect(result.stdout).toContain('Changes detected, but no breaking changes')
  })

  it('reports a number turned into a string as breaking and exits 1', async () => {
    responseBody = { id: 1, name: 'Ada', count: '5' }

    const result = await runCli(['compare'], workDir)

    expect(result.code).toBe(1)
    expect(result.stdout).toContain('1 breaking change(s)')
    expect(result.stdout).toContain('response.data.count: changed')
    expect(result.stdout).toContain('Breaking changes detected!')
  })

  it('reports a removed field as breaking and exits 1', async () => {
    responseBody = { id: 1, count: 5 }

    const result = await runCli(['compare'], workDir)

    expect(result.code).toBe(1)
    expect(result.stdout).toContain('response.data.name: removed')
  })

  it('exits 1 on breaking changes with --format json too', async () => {
    responseBody = { id: 1, name: 'Ada', count: '5' }

    const result = await runCli(['compare', '--format', 'json'], workDir)

    expect(result.code).toBe(1)
    const comparisons = JSON.parse(result.stdout)
    expect(comparisons[0].differences).toContainEqual(
      expect.objectContaining({ path: 'response.data.count', severity: 'breaking' })
    )
  })

  it('exits 0 with --format json when nothing changed', async () => {
    responseBody = { id: 1, name: 'Ada', count: 5 }

    const result = await runCli(['compare', '--format', 'json'], workDir)

    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)[0].hasChanges).toBe(false)
  })
})
