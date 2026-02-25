import {Args, Command, Flags} from '@oclif/core'
import path from 'node:path'

import {getActivePage} from '../lib/connect.js'

export default class Screenshot extends Command {
  static args = {
    file: Args.string({description: 'Output file path (default: screenshot-<timestamp>.png)'}),
    session: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Take a screenshot of the active tab'

  static examples = ['<%= config.bin %> screenshot work', '<%= config.bin %> screenshot work /tmp/page.png', '<%= config.bin %> screenshot work --full-page']

  static flags = {
    'full-page': Flags.boolean({default: false, description: 'Capture the full scrollable page'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Screenshot)

    const timestamp = new Date().toISOString().replaceAll(':', '-').replace('.', '-')
    const outFile = args.file ?? path.join(process.cwd(), `screenshot-${timestamp}.png`)

    const {browser, page} = await getActivePage(args.session)

    try {
      await page.screenshot({fullPage: flags['full-page'], path: outFile})
      this.log(`Screenshot saved: ${outFile}`)
    } finally {
      await browser.close()
    }
  }
}
