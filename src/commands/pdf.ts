import {Args, Command, Flags} from '@oclif/core'
import path from 'node:path'

import {getActivePage} from '../lib/connect.js'

export default class Pdf extends Command {
  static args = {
    file: Args.string({description: 'Output file path (default: page-<timestamp>.pdf)'}),
  }

  static description = 'Print the active tab to a PDF file'

  static examples = ['<%= config.bin %> pdf -s work', '<%= config.bin %> pdf -s work ~/Desktop/page.pdf', '<%= config.bin %> pdf -s work --landscape']

  static flags = {
    landscape: Flags.boolean({default: false, description: 'Print in landscape orientation'}),
    session: Flags.string({char: 's', description: 'Session name', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Pdf)

    const timestamp = new Date().toISOString().replaceAll(':', '-').replace('.', '-')
    const outFile = args.file ?? path.join(process.cwd(), `page-${timestamp}.pdf`)

    const {browser, page} = await getActivePage(flags.session)

    try {
      await page.pdf({landscape: flags.landscape, path: outFile})
      this.log(`PDF saved: ${outFile}`)
    } finally {
      await browser.close()
    }
  }
}
