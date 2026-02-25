import {Args, Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

interface ScrapeResult {
  html: string
  selector: string
  text: string
}

export default class Scrape extends Command {
  static args = {
    selector: Args.string({description: 'CSS selector', required: true}),
    session: Args.string({description: 'Session name', required: true}),
  }

  static description = 'Extract content from the page by CSS selector'

  static examples = [
    '<%= config.bin %> scrape work "h1"',
    '<%= config.bin %> scrape work ".article-body" --html',
    '<%= config.bin %> scrape work "table tr" --all',
  ]

  static flags = {
    all: Flags.boolean({default: false, description: 'Match all elements (returns array)'}),
    html: Flags.boolean({default: false, description: 'Include outerHTML in output'}),
    json: Flags.boolean({default: false, description: 'Output as JSON'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Scrape)

    const {browser, page} = await getActivePage(args.session)

    try {
      if (flags.all) {
        const results: ScrapeResult[] = await page.evaluate(
          ({html, selector}) => {
            const els = document.querySelectorAll(selector)
            return Array.from(els).map((el) => ({
              html: html ? el.outerHTML : '',
              selector,
              text: (el as HTMLElement).innerText?.trim() ?? el.textContent?.trim() ?? '',
            }))
          },
          {html: flags.html, selector: args.selector},
        )

        if (flags.json || flags.html) {
          this.log(JSON.stringify(results, null, 2))
        } else {
          for (const r of results) this.log(r.text)
        }
      } else {
        const result: ScrapeResult | null = await page.evaluate(
          ({html, selector}) => {
            const el = document.querySelector(selector)
            if (!el) return null
            return {
              html: html ? el.outerHTML : '',
              selector,
              text: (el as HTMLElement).innerText?.trim() ?? el.textContent?.trim() ?? '',
            }
          },
          {html: flags.html, selector: args.selector},
        )

        if (!result) {
          this.error(`No element found matching selector: ${args.selector}`)
        }

        if (flags.json || flags.html) {
          this.log(JSON.stringify(result, null, 2))
        } else {
          this.log(result.text)
        }
      }
    } finally {
      await browser.close()
    }
  }
}
