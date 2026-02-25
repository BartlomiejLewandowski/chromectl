import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
void __dirname // used for context

let browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never
let tmpFile: string

beforeAll(async () => {
  browser = await chromium.launch({headless: true})
  tmpFile = path.join(os.tmpdir(), 'chromectl-nav-test.html')
  await fs.writeFile(tmpFile, `<!DOCTYPE html><html><head><title>Nav Test</title></head><body><h1>Hello</h1></body></html>`)
}, 30_000)

afterAll(async () => {
  await browser?.close()
  await fs.unlink(tmpFile).catch(() => {})
})

describe('navigate integration', () => {
  it('navigates to a local file URL', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const fileUrl = `file://${tmpFile}`
    await page.goto(fileUrl)
    expect(page.url()).toBe(fileUrl)
    await context.close()
  })

  it('page title is correct after navigation', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`file://${tmpFile}`)
    expect(await page.title()).toBe('Nav Test')
    await context.close()
  })
})
