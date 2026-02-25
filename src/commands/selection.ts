import {Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Selection extends Command {
  static description = 'Capture the current text selection in the active tab'

  static examples = ['<%= config.bin %> selection -s work']

  static flags = {
    session: Flags.string({char: 's', description: 'Session name', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Selection)

    const {browser, page} = await getActivePage(flags.session)

    try {
      const result = await page.evaluate(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) return null

        const text = sel.toString()
        const range = sel.getRangeAt(0)
        const container = range.commonAncestorContainer
        const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element)

        return {
          anchorText: sel.anchorNode?.textContent?.trim().slice(0, 100) ?? '',
          html: el?.outerHTML?.slice(0, 2000) ?? '',
          rangeCount: sel.rangeCount,
          text,
        }
      })

      if (!result) {
        this.log('No text selected.')
        return
      }

      this.log(JSON.stringify(result, null, 2))
    } finally {
      await browser.close()
    }
  }
}
