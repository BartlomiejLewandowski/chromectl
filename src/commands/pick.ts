import {Args, Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'
import {OVERLAY_SCRIPT, type PickResult} from '../lib/overlay.js'

export default class Pick extends Command {
  static args = {
    session: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Inject an overlay to capture a clicked element (selector, HTML, styles)'

  static examples = ['<%= config.bin %> pick work']

  static flags = {
    timeout: Flags.integer({default: 60, description: 'Seconds to wait for element pick'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Pick)

    const {browser, page} = await getActivePage(args.session)

    try {
      this.log('Click an element in Chrome to capture it. Press Esc to cancel.')

      const result = await page.evaluate(OVERLAY_SCRIPT, {timeout: flags.timeout * 1000})

      if (!result) {
        this.log('Pick cancelled.')
        return
      }

      this.log(JSON.stringify(result as PickResult, null, 2))
    } finally {
      await browser.close()
    }
  }
}
