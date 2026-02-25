import {Args, Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Eval extends Command {
  static args = {
    js: Args.string({description: 'JavaScript expression to evaluate', required: true}),
    session: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Evaluate JavaScript in the active tab'

  static examples = [
    '<%= config.bin %> eval work "1 + 1"',
    '<%= config.bin %> eval work "document.title"',
    '<%= config.bin %> eval work "JSON.stringify(window.location)"',
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Parse and pretty-print result as JSON'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Eval)

    const {browser, page} = await getActivePage(args.session)

    try {
      const result = await page.evaluate(args.js)

      if (flags.json || (typeof result === 'object' && result !== null)) {
        this.log(JSON.stringify(result, null, 2))
      } else {
        this.log(String(result))
      }
    } finally {
      await browser.close()
    }
  }
}
