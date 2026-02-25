import {Args, Command} from '@oclif/core'

import {readSessions, removeSession} from '../../lib/sessions.js'

export default class SessionStop extends Command {
  static args = {
    name: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Kill a Chrome session'

  static examples = ['<%= config.bin %> session stop work']

  async run(): Promise<void> {
    const {args} = await this.parse(SessionStop)
    const {name} = args

    const sessions = await readSessions()
    const entry = sessions[name]

    if (!entry) {
      this.error(`Session "${name}" not found.`)
    }

    try {
      process.kill(entry.pid, 'SIGTERM')
      this.log(`Sent SIGTERM to Chrome (pid: ${entry.pid})`)
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ESRCH') {
        this.log(`Chrome process (pid: ${entry.pid}) was already gone.`)
      } else {
        throw err
      }
    }

    await removeSession(name)
    this.log(`Session "${name}" stopped.`)
  }
}
