import {chromium, type Browser, type Page} from 'playwright'

import {getSession} from './sessions.js'

export async function connectToSession(sessionName: string): Promise<Browser> {
  const entry = await getSession(sessionName)
  if (!entry) {
    throw new Error(`Session "${sessionName}" not found or not running. Start it with: chrome session start ${sessionName}`)
  }

  const wsUrl = await getCdpWsUrl(entry.port)
  const browser = await chromium.connectOverCDP(wsUrl)
  return browser
}

export async function getActivePage(sessionName: string): Promise<{browser: Browser; page: Page}> {
  const browser = await connectToSession(sessionName)
  const contexts = browser.contexts()

  if (contexts.length === 0) {
    throw new Error(`No browser contexts found in session "${sessionName}"`)
  }

  const pages = contexts[0].pages()
  if (pages.length === 0) {
    throw new Error(`No pages found in session "${sessionName}"`)
  }

  const page = pages[pages.length - 1]
  return {browser, page}
}

async function getCdpWsUrl(port: number): Promise<string> {
  const res = await fetch(`http://localhost:${port}/json/version`, {
    signal: AbortSignal.timeout(3000),
  })

  if (!res.ok) {
    throw new Error(`Failed to connect to Chrome debugger on port ${port}`)
  }

  const data = (await res.json()) as {webSocketDebuggerUrl: string}
  return data.webSocketDebuggerUrl
}
