import { expect, test, type Page } from '@playwright/test'

async function enterCockpit(page: Page, theme: 'dark' | 'light' = 'dark'): Promise<void> {
  await page.addInitScript((initialTheme) => {
    window.localStorage.setItem('cockpit-theme', initialTheme)
  }, theme)
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status,
        ),
      { timeout: 30_000 },
    )
    .toBe('ready')
  await page.waitForFunction(
    () =>
      Boolean(window.__setCockpitViewMode) &&
      window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 30_000 },
  )
}

async function playFirstRecord(page: Page): Promise<void> {
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
  await expect
    .poll(() => page.evaluate(() => window.__cockpitViewMode), {
      timeout: 30_000,
    })
    .toBe('deck')
}

test.describe('approved turntable registration tether', () => {
  test('uses the three-draw basic-material budget and live theme/accessibility palette', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await enterCockpit(page, 'dark')
    await playFirstRecord(page)

    const dark = await page.evaluate(() =>
      window.__COCKPIT_TEST_HOOKS__!.getDeckTether(),
    )
    expect(dark).toMatchObject({
      visible: true,
      forcedColors: false,
      reducedMotion: false,
      reducedTransparency: false,
      highContrast: false,
      hairlineOpacity: 0.55,
      footOpacity: 0.9,
      ringOpacity: 0.45,
      hairlineColor: '#7a9a7e',
      footColor: '#7fe6a4',
      ringColor: '#4b6e4f',
      drawCalls: 3,
      lineSegments: 2,
      shaderMaterials: 0,
      textures: 0,
      normalBlending: true,
    })
    expect(dark.hairlineScaleY).toBeCloseTo(1, 3)
    expect(dark.triangles).toBeLessThanOrEqual(160)

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
      window.__cockpitTheme = 'light'
      window.dispatchEvent(
        new CustomEvent('cockpit-theme', { detail: { theme: 'light' } }),
      )
    })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckTether()),
      )
      .toMatchObject({
        hairlineColor: '#3a5a3e',
        footColor: '#3a5a3e',
        ringColor: '#3a5a3e',
        hairlineOpacity: 0.5,
        footOpacity: 1,
        ringOpacity: 0.3,
        drawCalls: 3,
      })

    await page.evaluate(() => {
      document.documentElement.setAttribute(
        'data-a11y-transparency',
        'reduced',
      )
    })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckTether()),
      )
      .toMatchObject({
        reducedTransparency: true,
        hairlineColor: '#3a5a3e',
        footColor: '#3a5a3e',
        ringColor: '#3a5a3e',
        hairlineOpacity: 1,
        footOpacity: 1,
        ringOpacity: 1,
      })

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-a11y-contrast', 'high')
    })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckTether()),
      )
      .toMatchObject({
        highContrast: true,
        hairlineColor: '#14110f',
        footColor: '#14110f',
        ringColor: '#14110f',
        hairlineOpacity: 1,
        footOpacity: 1,
        drawCalls: 2,
      })
  })

  test('removes draw-on motion and hides decorative geometry in forced colors', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
    await enterCockpit(page, 'dark')

    await page.evaluate(() => {
      const runtime = window as Window & {
        __tetherPlayPromise?: Promise<void>
      }
      runtime.__tetherPlayPromise =
        window.__COCKPIT_TEST_HOOKS__!.playRecord(0)
    })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckTether()),
      )
      .toMatchObject({
        visible: true,
        reducedMotion: true,
        hairlineScaleY: 1,
        hairlineOpacity: 0.55,
        footOpacity: 0.9,
        ringOpacity: 0.45,
      })
    await page.evaluate(async () => {
      const runtime = window as Window & {
        __tetherPlayPromise?: Promise<void>
      }
      await runtime.__tetherPlayPromise
    })

    await page.emulateMedia({
      reducedMotion: 'reduce',
      forcedColors: 'active',
    })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckTether()),
      )
      .toMatchObject({
        visible: false,
        forcedColors: true,
        drawCalls: 0,
      })
  })
})
