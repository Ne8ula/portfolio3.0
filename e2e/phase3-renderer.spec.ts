import { expect, test, type Page } from '@playwright/test'

type RendererStatus = 'initializing' | 'ready' | 'lost' | 'restoring' | 'terminal'

async function waitForHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
}

async function rendererStatus(page: Page): Promise<RendererStatus> {
  return page.evaluate(
    () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status,
  )
}

async function waitForRendererStatus(
  page: Page,
  status: RendererStatus,
  timeout = 30_000,
): Promise<void> {
  await expect.poll(() => rendererStatus(page), { timeout }).toBe(status)
}

async function enterCockpitDirect(page: Page): Promise<void> {
  await page.goto('/')
  await waitForHooks(page)
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await waitForRendererStatus(page, 'ready')
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 30_000 },
  )
}

async function expectCanvasNotBlank(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => {
    const runtime = window as Window & {
      __cockpitRenderer?: {
        domElement: HTMLCanvasElement
        render(scene: unknown, camera: unknown): void
      } | null
      __cockpitScene?: unknown
      __cockpitCamera?: unknown
    }
    const renderer = runtime.__cockpitRenderer
    if (!renderer || !runtime.__cockpitScene || !runtime.__cockpitCamera) return null
    renderer.render(runtime.__cockpitScene, runtime.__cockpitCamera)

    const source = renderer.domElement
    const width = 160
    const height = Math.max(1, Math.round((source.height / source.width) * width))
    const probe = document.createElement('canvas')
    probe.width = width
    probe.height = height
    const context = probe.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0, width, height)
    const data = context.getImageData(0, 0, width, height).data
    const colors = new Map<number, number>()
    for (let index = 0; index < data.length; index += 4) {
      const color =
        ((data[index]! >> 4) << 8) |
        ((data[index + 1]! >> 4) << 4) |
        (data[index + 2]! >> 4)
      colors.set(color, (colors.get(color) ?? 0) + 1)
    }
    let dominant = 0
    for (const count of colors.values()) dominant = Math.max(dominant, count)
    const total = width * height
    return {
      distinctColors: colors.size,
      dominantShare: dominant / total,
      nonDominantFraction: 1 - dominant / total,
    }
  })

  expect(metrics, 'renderer/scene/camera bridge missing').not.toBeNull()
  expect(metrics!.distinctColors).toBeGreaterThanOrEqual(8)
  expect(metrics!.dominantShare).toBeLessThan(0.98)
  expect(metrics!.nonDominantFraction).toBeGreaterThan(0.02)
}

async function loseMainContext(page: Page): Promise<number> {
  const probeIndex = await page.evaluate(() => {
    type LoseContext = {
      loseContext(): void
      restoreContext(): void
    }
    type Probe = {
      canvas: HTMLCanvasElement
      extension: LoseContext
      defaultPrevented: boolean
    }
    const runtime = window as Window & {
      __cockpitRenderer?: {
        domElement: HTMLCanvasElement
        getContext(): WebGLRenderingContext | WebGL2RenderingContext
      } | null
      __phase3ContextProbes?: Probe[]
    }
    const renderer = runtime.__cockpitRenderer
    if (!renderer) throw new Error('main renderer missing')
    const extension = renderer
      .getContext()
      .getExtension('WEBGL_lose_context') as LoseContext | null
    if (!extension) throw new Error('WEBGL_lose_context unavailable')
    const probe: Probe = {
      canvas: renderer.domElement,
      extension,
      defaultPrevented: false,
    }
    runtime.__phase3ContextProbes ??= []
    runtime.__phase3ContextProbes.push(probe)
    renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        probe.defaultPrevented = event.defaultPrevented
      },
      { once: true },
    )
    extension.loseContext()
    return runtime.__phase3ContextProbes.length - 1
  })
  await expect
    .poll(() => rendererStatus(page), { timeout: 15_000 })
    .toMatch(/lost|terminal/)
  return probeIndex
}

async function restoreMainContext(page: Page, probeIndex: number): Promise<void> {
  await page.evaluate((index) => {
    const runtime = window as Window & {
      __phase3ContextProbes?: Array<{ extension: { restoreContext(): void } }>
    }
    const probe = runtime.__phase3ContextProbes?.[index]
    if (!probe) throw new Error(`context probe ${index} missing`)
    probe.extension.restoreContext()
  }, probeIndex)
}

async function readContextProbe(
  page: Page,
  probeIndex: number,
): Promise<{ defaultPrevented: boolean; detached: boolean; contextLost: boolean }> {
  return page.evaluate((index) => {
    const runtime = window as Window & {
      __phase3ContextProbes?: Array<{
        canvas: HTMLCanvasElement
        defaultPrevented: boolean
      }>
    }
    const probe = runtime.__phase3ContextProbes?.[index]
    if (!probe) throw new Error(`context probe ${index} missing`)
    const context =
      probe.canvas.getContext('webgl2') ?? probe.canvas.getContext('webgl')
    return {
      defaultPrevented: probe.defaultPrevented,
      detached: !probe.canvas.isConnected,
      contextLost: context?.isContextLost() ?? true,
    }
  }, probeIndex)
}

async function completeRestore(
  page: Page,
  probeIndex: number,
  expectedRebuildCount: number,
): Promise<void> {
  await restoreMainContext(page, probeIndex)
  await waitForRendererStatus(page, 'restoring')
  await waitForRendererStatus(page, 'ready')
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().rebuildCount,
        ),
      { timeout: 30_000 },
    )
    .toBe(expectedRebuildCount)
  await expect(page.locator('[data-layout-region="cockpit-stage"] canvas')).toHaveCount(1)
  await expect
    .poll(async () => (await readContextProbe(page, probeIndex)).contextLost, {
      timeout: 15_000,
    })
    .toBe(true)
}

test.describe('Phase 3 renderer lifecycle', () => {
  test('AC-5: cockpit renderer follows the contained stage and returns to fit', async ({
    page,
  }) => {
    await enterCockpitDirect(page)

    const responsiveStage = page.locator('.responsive-stage')
    await expect(responsiveStage).toHaveAttribute('data-stage-mode', 'fit')

    await page.setViewportSize({ width: 800, height: 450 })
    await expect(responsiveStage).toHaveAttribute('data-stage-mode', 'contained')
    const surface = page.locator('.responsive-stage-surface')
    await expect
      .poll(async () => {
        const box = await surface.boundingBox()
        return box ? { width: Math.round(box.width), height: Math.round(box.height) } : null
      })
      .toEqual({ width: 1024, height: 600 })
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main),
      )
      .toMatchObject({ cssWidth: 1024, cssHeight: 600 })
    await expectCanvasNotBlank(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(responsiveStage).toHaveAttribute('data-stage-mode', 'fit')
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main),
      )
      .toMatchObject({ cssWidth: 1440, cssHeight: 900 })
    await expectCanvasNotBlank(page)
  })

  test('AC-11/12/16: loss parks the loop and accessible recovery remounts one renderer', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
    await enterCockpitDirect(page)
    await expect(page.locator('[data-hud="site-header"]')).toBeVisible()
    await expect(page.locator('[data-hud="theme-toggle"]')).toBeVisible()

    const probeIndex = await loseMainContext(page)
    await waitForRendererStatus(page, 'lost')
    const frameAtLoss = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot().then((value) => value.frameId),
    )
    await page.waitForTimeout(250)
    const frameAfterWait = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot().then((value) => value.frameId),
    )
    expect(frameAfterWait).toBe(frameAtLoss)

    const panel = page.locator('[data-hud="renderer-recovery"]')
    await expect(panel).toBeVisible()
    await expect(panel).toBeFocused()
    await expect(panel).toContainText('3D · INTERRUPTED')
    await expect(panel).toContainText(
      'The 3D scene was interrupted. Waiting for the graphics system…',
    )
    const rendererScene = page.locator('[data-recovery-hidden]')
    await expect(rendererScene).toHaveAttribute('data-recovery-hidden', 'true')
    await expect(rendererScene).toBeHidden()
    await expect(page.locator('[data-renderer-recovery-backdrop]')).toBeVisible()
    await expect(page.locator('[data-hud="site-header"]')).toBeHidden()
    await expect(page.locator('[data-hud="screen-dialog"]')).toBeHidden()
    await expect(page.locator('[data-hud="theme-toggle"]')).toHaveCount(0)
    await expect(page.locator('.grain')).toHaveCount(0)
    await expect(page.locator('.vignette')).toHaveCount(0)
    const projects = panel.getByRole('link', { name: 'View projects' })
    await expect(projects).toHaveAttribute('href', '/projects')
    await page.keyboard.press('Tab')
    await expect(projects).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel).toBeVisible()
    await expect(page.locator('[data-hud="renderer-status"]')).toHaveText(
      'The 3D scene was interrupted. Waiting for the graphics system…',
    )
    const panelStyle = await panel.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        animationName: style.animationName,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
      }
    })
    expect(panelStyle.animationName).toBe('none')
    expect(panelStyle.borderStyle).toBe('solid')
    expect(Number.parseFloat(panelStyle.borderWidth)).toBeGreaterThanOrEqual(1)

    expect((await readContextProbe(page, probeIndex)).defaultPrevented).toBe(true)
    await restoreMainContext(page, probeIndex)
    await waitForRendererStatus(page, 'restoring')
    await expect(page.locator('[data-hud="renderer-status"]')).toHaveText(
      'Restoring the scene…',
    )
    await waitForRendererStatus(page, 'ready')
    await expect(page.locator('[data-hud="renderer-status"]')).toHaveText(
      '3D scene restored.',
    )
    await expect(page.locator('[data-hud="renderer-recovery"]')).toHaveCount(0)
    await expect(page.locator('[data-renderer-recovery-backdrop]')).toHaveCount(0)
    await expect(rendererScene).toHaveAttribute('data-recovery-hidden', 'false')
    await expect(rendererScene).toBeVisible()
    await expect(page.locator('[data-hud="site-header"]')).toBeVisible()
    await expect(page.locator('[data-hud="theme-toggle"]')).toBeVisible()
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeFocused()
    await expect(page.locator('[data-layout-region="cockpit-stage"] canvas')).toHaveCount(1)
    expect(
      await page.evaluate(
        () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().rebuildCount,
      ),
    ).toBe(1)
    await expectCanvasNotBlank(page)
  })

  test('AC-13: durable deck and monitor state restore at rest without contained scroll drift', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpitDirect(page)
    const root = page.locator('html')
    if ((await root.getAttribute('data-theme')) !== 'light') {
      await page.locator('[data-hud="theme-toggle"]').click()
    }
    await expect(root).toHaveAttribute('data-theme', 'light')
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    await expect
      .poll(() =>
        page.evaluate(() => ({
          mode: window.__cockpitViewMode,
          busy: window.__cockpitDeck?.busy,
          index: window.__cockpitDeck?.index,
          settled: window.__COCKPIT_TEST_HOOKS__!.isSettled(),
        })),
      )
      .toEqual({ mode: 'deck', busy: false, index: 0, settled: true })

    const durableBefore = await page.evaluate(() => {
      const runtime = window as Window & {
        __cockpitPC?: { position: { toArray(): number[] } } | null
      }
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        a11y: [
          'data-a11y-motion',
          'data-a11y-contrast',
          'data-a11y-transparency',
          'data-a11y-text',
          'data-a11y-controls',
        ].map((name) => document.documentElement.getAttribute(name)),
        pc: runtime.__cockpitPC?.position.toArray(),
      }
    })
    const deckProbe = await loseMainContext(page)
    await completeRestore(page, deckProbe, 1)
    await expect
      .poll(() =>
        page.evaluate(() => ({
          mode: window.__cockpitViewMode,
          busy: window.__cockpitDeck?.busy,
          index: window.__cockpitDeck?.index,
          settled: window.__COCKPIT_TEST_HOOKS__!.isSettled(),
        })),
      )
      .toEqual({ mode: 'deck', busy: false, index: 0, settled: true })
    expect(
      await page.evaluate(() => {
        const runtime = window as Window & {
          __cockpitPC?: { position: { toArray(): number[] } } | null
        }
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          a11y: [
            'data-a11y-motion',
            'data-a11y-contrast',
            'data-a11y-transparency',
            'data-a11y-text',
            'data-a11y-controls',
          ].map((name) => document.documentElement.getAttribute(name)),
          pc: runtime.__cockpitPC?.position.toArray(),
        }
      }),
    ).toEqual(durableBefore)

    await page.setViewportSize({ width: 800, height: 450 })
    const region = page.locator('.responsive-stage[data-stage-mode="contained"]')
    await expect(region).toBeVisible()
    await region.evaluate((element) => {
      element.scrollLeft = 112
      element.scrollTop = 76
    })
    const scrollBefore = await region.evaluate((element) => ({
      left: element.scrollLeft,
      top: element.scrollTop,
    }))
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    const returnControl = page.locator('[data-hud="return-control"] button')
    await expect(returnControl).toBeVisible()
    await returnControl.evaluate((element) => {
      ;(element as HTMLElement).focus({ preventScroll: true })
    })
    await expect(returnControl).toBeFocused()
    expect(
      await region.evaluate((element) => ({
        left: element.scrollLeft,
        top: element.scrollTop,
      })),
    ).toEqual(scrollBefore)
    const monitorProbe = await loseMainContext(page)
    await completeRestore(page, monitorProbe, 2)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const runtime = window as unknown as {
            __getCockpitScreenRect?: (() => { visible?: boolean } | null) | null
          }
          return {
            mode: window.__cockpitViewMode,
            visible: runtime.__getCockpitScreenRect?.()?.visible,
          }
        }),
      )
      .toEqual({ mode: 'monitor', visible: true })
    expect(
      await region.evaluate((element) => ({
        left: element.scrollLeft,
        top: element.scrollTop,
      })),
    ).toEqual(scrollBefore)
  })

  test('AC-14: loss during record flight restores the destination deck at rest', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpitDirect(page)
    await page.evaluate(() => {
      void window.__COCKPIT_TEST_HOOKS__!.playRecord(1)
    })
    await expect
      .poll(() => page.evaluate(() => window.__cockpitDeck?.busy))
      .toBe(true)

    const probeIndex = await loseMainContext(page)
    await completeRestore(page, probeIndex, 1)
    await expect
      .poll(() =>
        page.evaluate(() => ({
          mode: window.__cockpitViewMode,
          busy: window.__cockpitDeck?.busy,
          index: window.__cockpitDeck?.index,
          settled: window.__COCKPIT_TEST_HOOKS__!.isSettled(),
        })),
      )
      .toEqual({ mode: 'deck', busy: false, index: 1, settled: true })
  })

  test('AC-15/19/20/21: two-cycle soak releases contexts, then terminal fallback restarts', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpitDirect(page)
    await page.waitForTimeout(2_000)
    const memoryBaseline = await page.evaluate(() => {
      const runtime = window as Window & {
        __cockpitRenderer?: {
          info: { memory: { geometries: number; textures: number } }
        } | null
      }
      if (!runtime.__cockpitRenderer) throw new Error('main renderer missing')
      return { ...runtime.__cockpitRenderer.info.memory }
    })

    for (let cycle = 1; cycle <= 2; cycle += 1) {
      const probeIndex = await loseMainContext(page)
      await completeRestore(page, probeIndex, cycle)
      await page.waitForTimeout(2_000)
      await expect
        .poll(() =>
          page.evaluate(() => {
            const runtime = window as Window & {
              __cockpitRenderer?: {
                info: { memory: { geometries: number; textures: number } }
              } | null
            }
            if (!runtime.__cockpitRenderer) throw new Error('main renderer missing')
            return { ...runtime.__cockpitRenderer.info.memory }
          }),
        )
        .toEqual(memoryBaseline)
      await expectCanvasNotBlank(page)
      expect(await readContextProbe(page, probeIndex)).toEqual({
        defaultPrevented: true,
        detached: true,
        contextLost: true,
      })
    }

    await page.emulateMedia({ forcedColors: 'active' })
    const terminalProbe = await loseMainContext(page)
    await waitForRendererStatus(page, 'terminal')
    const notice = page.locator('[data-hud="cockpit-runtime-notice"]')
    await expect(notice).toBeVisible()
    await expect(notice).toBeFocused()
    await expect(notice).toContainText(
      'The 3D cockpit stopped after a graphics interruption and could not restart. Everything on this site is available as ordinary pages.',
    )
    await expect(notice.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '/projects',
    )
    await expect(notice.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    )
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toHaveCount(0)
    const shell = page.locator('[data-layout-region="app-shell"]')
    await expect(shell.locator(':scope > header')).not.toHaveAttribute('inert', '')
    await expect(shell.locator(':scope > main')).not.toHaveAttribute('inert', '')
    await expect(page.locator('html')).not.toHaveAttribute('data-document-scroll', 'lock')
    await expect
      .poll(async () => (await readContextProbe(page, terminalProbe)).contextLost)
      .toBe(true)

    const noticeStyle = await notice.evaluate((element) => {
      const style = getComputedStyle(element)
      return { borderStyle: style.borderStyle, borderWidth: style.borderWidth }
    })
    expect(noticeStyle.borderStyle).toBe('solid')
    expect(Number.parseFloat(noticeStyle.borderWidth)).toBeGreaterThanOrEqual(1)

    await notice.getByRole('button', { name: 'Restart the 3D cockpit' }).click()
    await waitForRendererStatus(page, 'ready')
    await expect(page.locator('[data-layout-region="boot"]')).toHaveCount(0)
    await expect(page.locator('[data-screen-label="00b Warp"]')).toHaveCount(0)
    await expect(page.locator('[data-layout-region="cockpit-stage"] canvas')).toHaveCount(1)
    await expectCanvasNotBlank(page)
  })

  test('AC-17: losing the disposable warp context completes immediately', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 640, height: 480 })
    await page.goto('/')
    await waitForHooks(page)
    await page.evaluate(() => {
      const testWindow = window as Window & { __warpTimeScale?: number }
      testWindow.__warpTimeScale = 100
      window.__COCKPIT_TEST_HOOKS__!.armWarpContextLoss()
    })
    const enter = page.getByRole('button', { name: /enter the room/i })
    await expect(enter).toBeVisible({ timeout: 45_000 })
    await enter.click()
    const warp = page.locator('[data-screen-label="00b Warp"]')
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__COCKPIT_TEST_HOOKS__!.getWarpLifecycle(),
        ),
        { timeout: 60_000 },
      )
      .toEqual({
        initialCoverColor: 'rgb(232, 228, 220)',
        contextLossTriggered: true,
        contextLossHandled: true,
      })
    await expect(warp).toHaveCount(0, { timeout: 45_000 })
    await waitForRendererStatus(page, 'ready')
    await expect(page.locator('[data-hud="renderer-recovery"]')).toHaveCount(0)
    await expect(page.locator('[data-hud="cockpit-runtime-notice"]')).toHaveCount(0)
    await expectCanvasNotBlank(page)
  })

  test('AC-18: first-load WebGL probe keeps the distinct Phase 2 wording', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value(this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
          if (contextId === 'webgl2' || contextId === 'webgl') return null
          return Reflect.apply(getContext, this, [contextId, ...args])
        },
      })
    })
    await page.goto('/')
    const notice = page.locator('.home-cockpit-notice')
    await expect(notice.locator('p').first()).toHaveText(
      'The 3D cockpit is unavailable in this browser. Everything is available as ordinary pages.',
    )
    await expect(notice.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '/projects',
    )
    await expect(notice.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about',
    )
    await expect(page.locator('[data-hud="cockpit-runtime-notice"]')).toHaveCount(0)
    await expect(page.locator('[data-layout-region="cockpit-shell"]')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-document-scroll', 'lock')
  })
})
