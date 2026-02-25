import {Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Logs extends Command {
  static description = 'Stream console and network events from the active tab'

  static examples = ['<%= config.bin %> logs -s work', '<%= config.bin %> logs -s work --no-network', '<%= config.bin %> logs -s work --no-console']

  static flags = {
    console: Flags.boolean({allowNo: true, default: true, description: 'Show console messages'}),
    network: Flags.boolean({allowNo: true, default: true, description: 'Show network requests'}),
    session: Flags.string({char: 's', description: 'Session name', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Logs)

    const {browser, page} = await getActivePage(flags.session)

    this.log(`Streaming logs for session "${flags.session}" (Ctrl+C to stop)...\n`)

    if (flags.console) {
      page.on('console', (msg) => {
        const type = msg.type().toUpperCase().padEnd(7)
        const ts = new Date().toISOString().slice(11, 23)
        this.log(`[${ts}] [CON] [${type}] ${msg.text()}`)
      })

      page.on('pageerror', (err) => {
        const ts = new Date().toISOString().slice(11, 23)
        this.log(`[${ts}] [CON] [ERROR  ] ${err.message}`)
      })
    }

    if (flags.network) {
      page.on('request', (req) => {
        const ts = new Date().toISOString().slice(11, 23)
        this.log(`[${ts}] [NET] [→ REQ  ] ${req.method()} ${req.url()}`)
      })

      page.on('response', (res) => {
        const ts = new Date().toISOString().slice(11, 23)
        const status = res.status()
        const label = status >= 400 ? `ERROR ${status}` : String(status).padEnd(7)
        this.log(`[${ts}] [NET] [← ${label}] ${res.url()}`)
      })

      page.on('requestfailed', (req) => {
        const ts = new Date().toISOString().slice(11, 23)
        this.log(`[${ts}] [NET] [← FAIL  ] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
      })
    }

    await new Promise<void>((resolve) => {
      process.on('SIGINT', async () => {
        this.log('\nStopping log stream.')
        await browser.close()
        resolve()
      })
    })
  }
}
