import {Args, Command, Flags} from '@oclif/core'
import {execSync, spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import {addSession, nextAvailablePort, PROFILES_DIR, readSessions} from '../../lib/sessions.js'

export default class SessionStart extends Command {
  static args = {
    name: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Launch headed Chrome with a persistent profile'

  static examples = ['<%= config.bin %> session start work', '<%= config.bin %> session start dev']

  static flags = {
    port: Flags.integer({description: 'Remote debugging port (auto-assigned if not specified)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(SessionStart)
    const {name} = args

    const sessions = await readSessions()

    if (sessions[name]) {
      this.error(`Session "${name}" already exists on port ${sessions[name].port}. Stop it first with: chrome session stop ${name}`)
    }

    const port = flags.port ?? (await nextAvailablePort(sessions))
    const profileDir = path.join(PROFILES_DIR, name)

    const chromeBin = findChromeBin()
    if (!chromeBin) {
      this.error('Could not find Google Chrome. Install Chrome or set CHROME_BIN environment variable.')
    }

    const chromeArgs = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ]

    this.log(`Starting Chrome session "${name}" on port ${port}...`)
    this.log(`Profile: ${profileDir}`)

    const child = spawn(chromeBin, chromeArgs, {
      detached: true,
      stdio: 'ignore',
    })

    child.unref()

    const pid = child.pid!
    await waitForPort(port, 10_000)

    await addSession(name, {pid, port})

    this.log(`Session "${name}" started (pid: ${pid}, port: ${port})`)
  }
}

function findChromeBin(): string | null {
  const envBin = process.env['CHROME_BIN']
  if (envBin) return envBin

  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'linux'
        ? ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
        : ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']

  for (const bin of candidates) {
    try {
      if (bin.startsWith('/') || bin.includes('\\')) {
        if (fs.existsSync(bin)) return bin
      } else {
        execSync(`which ${bin}`, {stdio: 'ignore'})
        return bin
      }
    } catch {}
  }

  return null
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/json`, {
        signal: AbortSignal.timeout(500),
      })
      if (res.ok) return
    } catch {}

    await new Promise((r) => setTimeout(r, 200))
  }

  throw new Error(`Chrome did not start on port ${port} within ${timeoutMs}ms`)
}
