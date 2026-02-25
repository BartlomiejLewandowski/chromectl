# chrome-cmd

CLI tool for managing persistent Chrome browser sessions. Aimed at developer workflows: remote debugging, scraping, screenshots, and feeding browser context back to Claude.

## Design

- **Headed Chrome** — sessions are visible browser windows (no headless)
- **Persistent profiles** — each session gets its own `--user-data-dir`, so cookies/auth/localStorage survive restarts
- **No daemon** — Chrome process itself holds state; CLI reconnects via CDP on each invocation
- **File-based registry** — `~/.chrome-cmd/sessions.json` tracks name → port; stale entries pruned on every read

## Install

```bash
npm install
npm run build
npm link   # makes `chrome` available globally
npx playwright install chromium  # only needed for tests
```

## Commands

### Session management

```bash
chrome session start <name>    # Launch headed Chrome with persistent profile
chrome session stop <name>     # Kill Chrome session
chrome session list            # List sessions with port + status
```

### Browser interaction

```bash
chrome navigate <session> <url>           # Navigate active tab to URL
chrome screenshot <session> [file]        # Save screenshot (PNG)
chrome eval <session> <js>               # Evaluate JS expression, print result
chrome scrape <session> <selector>       # Extract text by CSS selector
chrome scrape <session> <selector> --all --html  # All matches, include HTML
chrome pick <session>                    # Inject overlay, click to capture element
chrome selection <session>               # Capture current text selection
chrome logs <session>                    # Stream console + network events
```

## Examples

```bash
chrome session start work
chrome navigate work https://github.com
chrome screenshot work ~/Desktop/github.png
chrome eval work "document.title"
chrome scrape work ".nav-item" --all
chrome pick work       # hover + click → JSON with selector/HTML/styles
chrome logs work       # stream console + network until Ctrl+C
chrome session list
chrome session stop work
```

## `chrome pick` output

```json
{
  "selector": ".card-header > h2",
  "outerHTML": "<h2 class=\"...\">...</h2>",
  "text": "Card Title",
  "styles": { "color": "rgb(33, 37, 41)", "font-size": "20px" }
}
```

Paste into Claude: *"fix this element"* + JSON.

## Development

```bash
npm run build           # tsc → dist/
npm run dev             # watch mode
npm test                # all tests
npm run test:unit       # unit tests only (mock fs/fetch, fast)
npm run test:integration  # real Chromium tests
```
