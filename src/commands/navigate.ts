import {Args, Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Navigate extends Command {
  static args = {
    url: Args.string({description: 'URL to navigate to', required: true}),
  }

  static description = 'Navigate the active tab to a URL'

  static examples = ['<%= config.bin %> navigate -s work https://google.com', '<%= config.bin %> navigate -s dev http://localhost:3000']

  static flags = {
    session: Flags.string({char: 's', description: 'Session name', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Navigate)

    const {browser, page} = await getActivePage(flags.session)

    try {
      this.log(`Navigating to ${args.url}...`)
      await page.goto(args.url, {waitUntil: 'domcontentloaded'})
      this.log(`Navigated to: ${page.url()}`)
    } finally {
      await browser.close()
    }
  }
}
