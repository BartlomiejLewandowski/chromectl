# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`chromectl` is a CLI tool for managing persistent, headed Chrome browser sessions. It targets developer workflows: remote debugging, scraping, screenshots, and feeding browser context back to Claude. Key design decisions:

- Sessions are **visible browser windows** (never headless)
- Each session gets its own `--user-data-dir` so cookies/auth/localStorage persist across restarts
- No daemon — Chrome holds state; the CLI reconnects via CDP on each invocation
- Session registry is a flat JSON file at `~/.chromectl/sessions.json`

## Commands

```bash
npm run build           # tsc → dist/
npm run dev             # watch mode (tsc --watch)
npm test                # all tests
npm run test:unit       # unit tests only (fast, no browser required)
npm run test:integration  # real Chromium tests (requires: npx playwright install chromium)
```

Run a single test file:
```bash
npx vitest run src/tests/sessions.test.ts
```

After making code changes, rebuild before testing CLI behavior:
```bash
npm run build && chromectl <command>
```

## Architecture

**Framework**: [oclif](https://oclif.io/) CLI framework. Commands live in `src/commands/` and are auto-discovered from `dist/commands/` at runtime. Sub-commands use directory nesting (`session/start.ts`, `session/stop.ts`, `session/list.ts`).

**Core libraries** (`src/lib/`):
- `sessions.ts` — Registry of active sessions. Reads/writes `~/.chromectl/sessions.json` (name → `{pid, port}`). Every read calls `readValidatedSessions()`, which probes each port via CDP HTTP and prunes stale entries automatically. Chrome profiles are stored in `~/.chrome-cmd/profiles/<name>/`.
- `connect.ts` — Connects to a running Chrome session over CDP using Playwright's `chromium.connectOverCDP()`. `getActivePage()` returns the last page in the first browser context (the "active" tab).
- `overlay.ts` — Self-contained JS string (`OVERLAY_SCRIPT`) injected via `page.evaluate()` for the `pick` command. Adds a hover-highlight overlay and resolves a promise with `{selector, outerHTML, text, styles}` on click.

**CDP transport**: The CLI never launches a headless browser. `session start` spawns headed Chrome with `--remote-debugging-port=<N>` and records the port. All other commands connect to that live Chrome instance via Playwright's CDP bridge.

**Port allocation**: Sessions start at port 9222, incrementing to fill gaps.

**Tests**: Unit tests (`src/tests/sessions.test.ts`, `connect.test.ts`) mock `node:fs/promises` and `fetch` via `vi.mock`/`vi.stubGlobal`. Integration tests (`src/tests/integration/`) use a real Playwright-launched Chromium in headless mode — they do not depend on the session registry.

**Build output**: TypeScript compiles to `dist/` (ESM, `"module": "ESNext"`). The binary entrypoint is `bin/run.js` → `dist/index.js`, which delegates to oclif's `run()`.
