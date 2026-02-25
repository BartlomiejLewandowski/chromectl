# chromectl

CLI tool for managing persistent Chrome browser sessions. Aimed at developer workflows: remote debugging, scraping, screenshots, and feeding browser context back to Claude.
It's similar in spirit to tools like `tmux` - create named sessions that one can use CLI commands on to interact as an agent, while allowing user access as well.

## Design

- **Headed Chrome** — sessions are visible browser windows (no headless)
- **Persistent profiles** — each session gets its own `--user-data-dir`, so cookies/auth/localStorage survive restarts
- **No daemon** — Chrome process itself holds state; CLI reconnects via CDP on each invocation
- **File-based registry** — `~/.chromectl/sessions.json` tracks name → port; stale entries pruned on every read

## Install

```bash
npm install
npm run build
npm link   # makes `chromectl` available globally
npx playwright install chromium  # only needed for tests
```

## Commands

### Session management

```bash
chromectl session start <name>    # Launch headed Chrome with persistent profile
chromectl session stop <name>     # Kill Chrome session
chromectl session list            # List sessions with port + status
```

### Browser interaction

```bash
chromectl navigate <session> <url>           # Navigate active tab to URL
chromectl screenshot <session> [file]        # Save screenshot (PNG)
chromectl eval <session> <js>               # Evaluate JS expression, print result
chromectl scrape <session> <selector>       # Extract text by CSS selector
chromectl scrape <session> <selector> --all --html  # All matches, include HTML
chromectl pick <session>                    # Inject overlay, click to capture element
chromectl pick <session> --timeout 30      # Custom timeout in seconds (default: 60)
chromectl selection <session>               # Capture current text selection
chromectl logs <session>                    # Stream console + network events
```

## Examples

```bash
chromectl session start work
chromectl navigate work https://github.com
chromectl screenshot work ~/Desktop/github.png
chromectl eval work "document.title"
chromectl scrape work ".nav-item" --all
chromectl pick work       # terminal bell + blue banner in Chrome; hover to highlight, click to capture
chromectl logs work       # stream console + network until Ctrl+C
chromectl session list
chromectl session stop work
```

## `chromectl pick`

Activating pick mode rings the terminal bell and injects a blue banner into the page so it's clear interaction is needed. Hover over any element to see it highlighted with its selector, then:

- **Click** — capture the element
- **Shift+click** — walk up to the parent element
- **Esc** — cancel

Output:

```json
{
  "selector": ".card-header > h2",
  "outerHTML": "<h2 class=\"...\">...</h2>",
  "text": "Card Title",
  "styles": { "color": "rgb(33, 37, 41)", "font-size": "20px" }
}
```

Paste into Claude: *"fix this element"* + JSON.

A test fixture is available at `test/fixtures/pick.html` — a simple page with colored divs for verifying pick mode locally.

## Development

```bash
npm run build           # tsc → dist/
npm run dev             # watch mode
npm test                # all tests
npm run test:unit       # unit tests only (mock fs/fetch, fast)
npm run test:integration  # real Chromium tests
```
