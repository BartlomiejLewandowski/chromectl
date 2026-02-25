import {Args, Command, Flags} from '@oclif/core'

import {getActivePage} from '../lib/connect.js'

export default class Eval extends Command {
  static args = {
    js: Args.string({description: 'JavaScript expression to evaluate (reads from stdin if omitted)', required: false}),
  }

  static description = "Evaluate JavaScript in the active tab. Use heredoc stdin for multi-line scripts (chromectl eval -s <session> << 'EOF')"

  static examples = [
    '<%= config.bin %> eval -s work "1 + 1"',
    '<%= config.bin %> eval -s work "document.title"',
    '<%= config.bin %> eval -s work "JSON.stringify(window.location)"',
    `# Multi-line scripts via heredoc (preferred for complex scripts):
<%= config.bin %> eval -s work << 'EOF'
const el = document.querySelector('h1');
el.style.color = 'red';
EOF`,
  ]

  static flags = {
    json: Flags.boolean({default: false, description: 'Parse and pretty-print result as JSON'}),
    session: Flags.string({char: 's', description: 'Session name', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Eval)

    let js = args.js
    if (!js) {
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
      js = Buffer.concat(chunks).toString('utf8').trim()
    }

    if (!js) this.error('No JavaScript provided (pass as argument or via stdin)')

    const {browser, page} = await getActivePage(flags.session)

    try {
      const result = await page.evaluate(js)

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
