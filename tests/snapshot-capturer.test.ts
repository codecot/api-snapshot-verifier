import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server, type IncomingHttpHeaders } from 'http'
import type { AddressInfo } from 'net'
import { SnapshotCapturer } from '../src/snapshot-capturer.js'

interface Received {
  method?: string
  headers: IncomingHttpHeaders
  body: string
}

describe('SnapshotCapturer', () => {
  let server: Server
  let baseUrl: string
  let last: Received

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', chunk => (body += chunk))
      req.on('end', () => {
        last = { method: req.method, headers: req.headers, body }
        if (req.url === '/slow') {
          setTimeout(() => res.end('{}'), 500)
          return
        }
        if (req.url === '/missing') {
          res.writeHead(404, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'not found' }))
          return
        }
        res.writeHead(200, {
          'content-type': 'application/json',
          'set-cookie': 'session=secret',
          'x-api-key': 'secret'
        })
        res.end(JSON.stringify({ ok: true }))
      })
    })
    await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise(done => server.close(done))
  })

  it('records status, lower-cased headers and parsed JSON data', async () => {
    const result = await new SnapshotCapturer().captureSnapshot({ name: 'ok', url: `${baseUrl}/ok`, method: 'GET' })

    expect(result.success).toBe(true)
    const snapshot = result.snapshot!
    expect(snapshot.endpoint.name).toBe('ok')
    expect(snapshot.response.status).toBe(200)
    expect(snapshot.response.data).toEqual({ ok: true })
    expect(snapshot.response.headers['content-type']).toBe('application/json')
    expect(typeof snapshot.response.duration).toBe('number')
    expect(new Date(snapshot.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('redacts sensitive response headers', async () => {
    const result = await new SnapshotCapturer().captureSnapshot({ name: 'ok', url: `${baseUrl}/ok`, method: 'GET' })

    expect(result.snapshot!.response.headers['set-cookie']).toBe('[REDACTED]')
    expect(result.snapshot!.response.headers['x-api-key']).toBe('[REDACTED]')
  })

  it('sends configured headers and a JSON body for POST', async () => {
    await new SnapshotCapturer().captureSnapshot({
      name: 'create',
      url: `${baseUrl}/create`,
      method: 'POST',
      headers: { 'X-Test': 'yes' },
      body: { title: 'hello' }
    })

    expect(last.method).toBe('POST')
    expect(last.headers['x-test']).toBe('yes')
    expect(JSON.parse(last.body)).toEqual({ title: 'hello' })
  })

  it('sends header values as written, without expanding ${VAR} placeholders', async () => {
    process.env.API_TOKEN = 'expanded'
    try {
      await new SnapshotCapturer().captureSnapshot({
        name: 'auth',
        url: `${baseUrl}/auth`,
        method: 'GET',
        headers: { Authorization: 'Bearer ${API_TOKEN}' }
      })
    } finally {
      delete process.env.API_TOKEN
    }

    expect(last.headers.authorization).toBe('Bearer ${API_TOKEN}')
  })

  it('does not send a body for GET', async () => {
    await new SnapshotCapturer().captureSnapshot({
      name: 'get',
      url: `${baseUrl}/get`,
      method: 'GET',
      body: { ignored: true }
    })

    expect(last.method).toBe('GET')
    expect(last.body).toBe('')
  })

  it('records non-2xx responses instead of failing', async () => {
    const result = await new SnapshotCapturer().captureSnapshot({ name: 'missing', url: `${baseUrl}/missing`, method: 'GET' })

    expect(result.success).toBe(true)
    expect(result.snapshot!.response.status).toBe(404)
    expect(result.snapshot!.response.data).toEqual({ error: 'not found' })
  })

  it('fails with an error when the endpoint timeout is exceeded', async () => {
    const result = await new SnapshotCapturer().captureSnapshot({
      name: 'slow',
      url: `${baseUrl}/slow`,
      method: 'GET',
      timeout: 50
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout/i)
  })
})
