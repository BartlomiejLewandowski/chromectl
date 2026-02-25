import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

let browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never
let tmpFile: string

beforeAll(async () => {
  browser = await chromium.launch({headless: true})
  tmpFile = path.join(os.tmpdir(), 'chrome-cmd-scrape-test.html')
  await fs.writeFile(
    tmpFile,
    `<!DOCTYPE html><html><head><title>Scrape Test</title></head><body>
      <h1 id="heading">Main Heading</h1>
      <ul><li class="item">Item 1</li><li class="item">Item 2</li><li class="item">Item 3</li></ul>
      <p class="desc">Some description text</p>
    </body></html>`,
  )
}, 30_000)

afterAll(async () => {
  await browser?.close()
  await fs.unlink(tmpFile).catch(() => {})
})

describe('scrape integration', () => {
  it('scrapes text from a single element by id', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`file://${tmpFile}`)
    const text = await page.evaluate((sel) => (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? null, '#heading')
    expect(text).toBe('Main Heading')
    await context.close()
  })

  it('scrapes all elements matching a selector', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`file://${tmpFile}`)
    const items = await page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((el) => (el as HTMLElement).innerText?.trim() ?? ''), '.item')
    expect(items).toEqual(['Item 1', 'Item 2', 'Item 3'])
    await context.close()
  })

  it('returns null for non-existent selector', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`file://${tmpFile}`)
    expect(await page.evaluate((sel) => document.querySelector(sel), '.nonexistent')).toBeNull()
    await context.close()
  })

  it('scrapes outerHTML correctly', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`file://${tmpFile}`)
    const html = await page.evaluate((sel) => document.querySelector(sel)?.outerHTML ?? null, '.desc')
    expect(html).toContain('Some description text')
    expect(html).toContain('<p')
    await context.close()
  })
})
