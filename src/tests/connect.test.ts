import {beforeEach, describe, expect, it, vi} from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('../lib/sessions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/sessions.js')>()
  return {
    ...actual,
    getSession: vi.fn(),
  }
})

import {getSession, probePort} from '../lib/sessions.js'

const mockGetSession = vi.mocked(getSession)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('probePort', () => {
  it('returns true when port responds ok', async () => {
    mockFetch.mockResolvedValue({ok: true})
    expect(await probePort(9222)).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:9222/json', expect.objectContaining({signal: expect.any(AbortSignal)}))
  })

  it('returns false when port responds non-ok', async () => {
    mockFetch.mockResolvedValue({ok: false})
    expect(await probePort(9222)).toBe(false)
  })

  it('returns false when fetch throws (connection refused)', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await probePort(9222)).toBe(false)
  })

  it('returns false on timeout', async () => {
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'))
    expect(await probePort(9999)).toBe(false)
  })
})

describe('getSession', () => {
  it('returns session entry when session exists', async () => {
    mockGetSession.mockResolvedValue({pid: 1234, port: 9222})
    expect(await getSession('work')).toEqual({pid: 1234, port: 9222})
  })

  it('returns undefined when session does not exist', async () => {
    mockGetSession.mockResolvedValue(undefined)
    expect(await getSession('nonexistent')).toBeUndefined()
  })
})
