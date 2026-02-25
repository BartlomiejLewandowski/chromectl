import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('node:fs/promises', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:fs/promises')>()
  return {
    default: {
      ...mod,
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  }
})

import fs from 'node:fs/promises'
import {addSession, nextAvailablePort, readSessions, readValidatedSessions, removeSession} from '../lib/sessions.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReadFile = vi.mocked(fs.readFile) as any
const mockWriteFile = vi.mocked(fs.writeFile)

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  mockWriteFile.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('readSessions', () => {
  it('returns empty object when file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    const sessions = await readSessions()
    expect(sessions).toEqual({})
  })

  it('parses sessions.json correctly', async () => {
    const data = {work: {pid: 1234, port: 9222}}
    mockReadFile.mockResolvedValue(JSON.stringify(data))
    const sessions = await readSessions()
    expect(sessions).toEqual(data)
  })
})

describe('readValidatedSessions', () => {
  it('removes stale sessions where port does not respond', async () => {
    const data = {dev: {pid: 5678, port: 9223}, work: {pid: 1234, port: 9222}}
    mockReadFile.mockResolvedValue(JSON.stringify(data))
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('9222')) return Promise.resolve({ok: true})
      return Promise.reject(new Error('ECONNREFUSED'))
    })

    const sessions = await readValidatedSessions()
    expect(sessions).toEqual({work: {pid: 1234, port: 9222}})
    expect(mockWriteFile).toHaveBeenCalledOnce()
  })

  it('returns all sessions when all ports are alive', async () => {
    const data = {dev: {pid: 5678, port: 9223}, work: {pid: 1234, port: 9222}}
    mockReadFile.mockResolvedValue(JSON.stringify(data))
    mockFetch.mockResolvedValue({ok: true})

    const sessions = await readValidatedSessions()
    expect(sessions).toEqual(data)
    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('returns empty object and writes when all sessions are stale', async () => {
    const data = {work: {pid: 1234, port: 9222}}
    mockReadFile.mockResolvedValue(JSON.stringify(data))
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const sessions = await readValidatedSessions()
    expect(sessions).toEqual({})
    expect(mockWriteFile).toHaveBeenCalledOnce()
  })
})

describe('addSession', () => {
  it('adds a new session to the file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({}))
    await addSession('test', {pid: 9999, port: 9225})

    expect(mockWriteFile).toHaveBeenCalledOnce()
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written).toEqual({test: {pid: 9999, port: 9225}})
  })

  it('merges with existing sessions', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({existing: {pid: 1111, port: 9222}}))
    await addSession('new', {pid: 2222, port: 9223})

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written).toEqual({existing: {pid: 1111, port: 9222}, new: {pid: 2222, port: 9223}})
  })
})

describe('removeSession', () => {
  it('removes a session from the file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({keep: {pid: 2222, port: 9223}, remove: {pid: 1111, port: 9222}}))
    await removeSession('remove')

    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written).toEqual({keep: {pid: 2222, port: 9223}})
  })

  it('does not fail if session does not exist', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({}))
    await expect(removeSession('nonexistent')).resolves.not.toThrow()
  })
})

describe('nextAvailablePort', () => {
  it('returns 9222 when no sessions exist', async () => {
    expect(await nextAvailablePort({})).toBe(9222)
  })

  it('returns next port after all used ports', async () => {
    expect(await nextAvailablePort({a: {pid: 1, port: 9222}, b: {pid: 2, port: 9223}})).toBe(9224)
  })

  it('fills gaps in port range', async () => {
    expect(await nextAvailablePort({a: {pid: 1, port: 9222}, b: {pid: 2, port: 9224}})).toBe(9223)
  })
})
