import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export interface SessionEntry {
  pid: number
  port: number
}

export interface SessionMap {
  [name: string]: SessionEntry
}

const CHROME_CMD_DIR = path.join(os.homedir(), '.chrome-cmd')
const SESSIONS_FILE = path.join(CHROME_CMD_DIR, 'sessions.json')
export const PROFILES_DIR = path.join(CHROME_CMD_DIR, 'profiles')

export async function ensureDir(): Promise<void> {
  await fs.mkdir(CHROME_CMD_DIR, {recursive: true})
  await fs.mkdir(PROFILES_DIR, {recursive: true})
}

export async function readSessions(): Promise<SessionMap> {
  await ensureDir()
  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf-8')
    return JSON.parse(raw) as SessionMap
  } catch {
    return {}
  }
}

export async function writeSessions(sessions: SessionMap): Promise<void> {
  await ensureDir()
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8')
}

export async function probePort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/json`, {
      signal: AbortSignal.timeout(1000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function readValidatedSessions(): Promise<SessionMap> {
  const sessions = await readSessions()
  const pruned: SessionMap = {}
  let changed = false

  await Promise.all(
    Object.entries(sessions).map(async ([name, entry]) => {
      const alive = await probePort(entry.port)
      if (alive) {
        pruned[name] = entry
      } else {
        changed = true
      }
    }),
  )

  if (changed) {
    await writeSessions(pruned)
  }

  return pruned
}

export async function getSession(name: string): Promise<SessionEntry | undefined> {
  const sessions = await readValidatedSessions()
  return sessions[name]
}

export async function addSession(name: string, entry: SessionEntry): Promise<void> {
  const sessions = await readSessions()
  sessions[name] = entry
  await writeSessions(sessions)
}

export async function removeSession(name: string): Promise<void> {
  const sessions = await readSessions()
  delete sessions[name]
  await writeSessions(sessions)
}

export async function nextAvailablePort(sessions: SessionMap): Promise<number> {
  const usedPorts = new Set(Object.values(sessions).map((s) => s.port))
  let port = 9222
  while (usedPorts.has(port)) {
    port++
  }

  return port
}
