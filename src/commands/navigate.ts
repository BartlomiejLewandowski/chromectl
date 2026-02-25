import {Args, Command} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Navigate extends Command {
  static args = {
    session: Args.string({description: 'Session name', required: true}),
    url: Args.string({description: 'URL to navigate to', required: true}),
  }

  static description = 'Navigate the active tab to a URL'

  static examples = ['<%= config.bin %> navigate work https://google.com', '<%= config.bin %> navigate dev http://localhost:3000']

  async run(): Promise<void> {
    const {args} = await this.parse(Navigate)

    const {browser, page} = await getActivePage(args.session)

    try {
      this.log(`Navigating to ${args.url}...`)
      await page.goto(args.url, {waitUntil: 'domcontentloaded'})
      this.log(`Navigated to: ${page.url()}`)
    } finally {
      await browser.close()
    }
  }
}
