import {chromium} from 'playwright'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

let browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never

beforeAll(async () => {
  browser = await chromium.launch({headless: true})
}, 30_000)

afterAll(async () => {
  await browser?.close()
})

describe('eval integration', () => {
  it('evaluates arithmetic expression', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('about:blank')
    expect(await page.evaluate('1 + 1')).toBe(2)
    await context.close()
  })

  it('evaluates document.title on a page', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.setContent('<html><head><title>Test Page</title></head><body></body></html>')
    expect(await page.evaluate('document.title')).toBe('Test Page')
    await context.close()
  })

  it('evaluates complex JS returning an object', async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('about:blank')
    expect(await page.evaluate('({ foo: "bar", num: 42 })')).toEqual({foo: 'bar', num: 42})
    await context.close()
  })
})
