// Phase 2 §12 Step 2: the root server-document/client-cockpit boundary.
// Step 4 owns the complete tier matrices and initial-response assertions;
// these focused checks cover the new WebGL gate and cockpit action seams.

import { expect, test, type Page } from '@playwright/test'

async function enterCockpitDirect(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 30_000 },
  )
}

test.describe('Phase 2 root boundary', () => {
  test('WebGL unavailable keeps the canonical document operable', async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value(this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
          if (contextId === 'webgl2' || contextId === 'webgl') return null
          return Reflect.apply(originalGetContext, this, [contextId, ...args])
        },
      })
    })

    await page.goto('/')

    const shell = page.locator('[data-layout-region="app-shell"]')
    const header = shell.locator(':scope > header')
    const main = shell.locator(':scope > main')
    const notice = page.locator('.home-cockpit-notice')

    await expect(notice).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-cockpit-enhancement',
      /.+/,
    )
    await expect(page.locator('[data-layout-region="cockpit-shell"]')).toHaveCount(0)
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toHaveCount(0)
    await expect(header).not.toHaveAttribute('inert', '')
    await expect(main).not.toHaveAttribute('inert', '')
    await expect(page.locator('html')).not.toHaveAttribute('data-document-scroll', 'lock')
    await expect(notice.getByRole('link', { name: /^view projects$/i })).toHaveAttribute(
      'href',
      '/projects',
    )
    await expect(notice.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/about',
    )
  })

  test('full cockpit preserves shared links, honest stub labelling, and native project navigation', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await enterCockpitDirect(page)

    const shell = page.locator('[data-layout-region="app-shell"]')
    const documentHeader = shell.locator(':scope > header')
    const documentMain = shell.locator(':scope > main')
    await expect(documentHeader).toHaveAttribute('inert', '')
    await expect(documentMain).toHaveAttribute('inert', '')
    await expect(page.locator('html')).toHaveAttribute('data-document-scroll', 'lock')

    const tabbableBehindOverlay = await documentMain.evaluate((main) =>
      Array.from(
        main.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.closest('[inert]')).length,
    )
    expect(tabbableBehindOverlay).toBe(0)

    const documentNavHrefs = await shell
      .locator('[data-hud="primary-nav"] a')
      .evaluateAll((anchors) =>
        anchors.slice(0, 3).map((anchor) => anchor.getAttribute('href')),
      )
    const cockpitHeader = page.locator('[data-hud="site-header"]')
    const cockpitNav = cockpitHeader.locator('nav[aria-label="Primary"]')
    await expect(cockpitHeader.getByRole('link', { name: /home/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const cockpitNavHrefs = await cockpitNav.locator(':scope > div > a').evaluateAll(
      (anchors) => anchors.map((anchor) => anchor.getAttribute('href')),
    )
    expect(cockpitNavHrefs).toEqual(documentNavHrefs)

    const projectsLink = cockpitNav.getByRole('link', { name: /^projects$/i })
    await expect(projectsLink).toHaveAttribute('data-active', 'false')
    await projectsLink.focus()
    await expect(cockpitNav.getByRole('link', { name: /^completed\b/i })).toBeVisible()
    await expect(
      cockpitNav.getByRole('link', { name: /^in progress\b/i }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(cockpitNav.getByRole('link', { name: /^completed\b/i })).toHaveCount(0)
    await expect(projectsLink).toBeFocused()

    await page.getByRole('button', { name: /switch to light mode/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(cockpitNav.getByRole('link', { name: /^about$/i })).toBeVisible()
    await page.getByRole('button', { name: /switch to dark mode/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    await expect(
      page.locator('#axos-future-stub-label'),
    ).toContainText('AX/OS demonstration — message sending is not implemented.')
    await expect(
      page.getByRole('button', {
        name: 'AX/OS demonstration — message sending is not implemented.',
      }),
    ).toBeDisabled()

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    const projectLink = page.getByRole('link', { name: /^view more: song of maka$/i })
    await expect(projectLink).toBeVisible()
    await expect(projectLink).toHaveAttribute('href', '/projects/songofmaka')
  })

  test('completed intro does not replay after project navigation and browser Back', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: /enter the room/i }).click()
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect
      .poll(() =>
        page.evaluate(
          () => sessionStorage.getItem('cockpit-intro-complete-v1'),
        ),
      )
      .toBe('true')

    await page
      .locator('[data-hud="site-header"]')
      .getByRole('link', { name: /^projects$/i })
      .click()
    await expect(page).toHaveURL(/\/projects$/)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('[data-layout-region="boot"]')).toHaveCount(0)
    await expect(page.locator('[data-screen-label="00b Warp"]')).toHaveCount(0)
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible({
      timeout: 30_000,
    })
    const cockpitHeader = page.locator('[data-hud="site-header"]')
    await expect(cockpitHeader.getByRole('link', { name: /home/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(
      cockpitHeader.getByRole('link', { name: /^projects$/i }),
    ).toHaveAttribute('data-active', 'false')
  })
})
