import {Command, Flags} from '@oclif/core'

import {probePort, readSessions} from '../../lib/sessions.js'

export default class SessionList extends Command {
  static description = 'List all Chrome sessions'

  static examples = ['<%= config.bin %> session list']

  static flags = {
    json: Flags.boolean({description: 'Output as JSON'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(SessionList)

    const sessions = await readSessions()
    const entries = Object.entries(sessions)

    if (entries.length === 0) {
      this.log('No sessions found.')
      return
    }

    const statuses = await Promise.all(
      entries.map(async ([name, entry]) => {
        const alive = await probePort(entry.port)
        return {
          alive,
          name,
          pid: entry.pid,
          port: entry.port,
          status: alive ? 'running' : 'stale',
        }
      }),
    )

    if (flags.json) {
      this.log(JSON.stringify(statuses, null, 2))
      return
    }

    const nameWidth = Math.max(4, ...statuses.map((s) => s.name.length))
    const header = `${'NAME'.padEnd(nameWidth)}  PORT   PID      STATUS`
    this.log(header)
    this.log('-'.repeat(header.length))

    for (const s of statuses) {
      this.log(`${s.name.padEnd(nameWidth)}  ${String(s.port).padEnd(5)}  ${String(s.pid).padEnd(7)}  ${s.status}`)
    }
  }
}
