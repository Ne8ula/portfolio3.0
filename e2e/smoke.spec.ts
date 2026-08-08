// Phase 0 browser smoke test (plan §8 Phase 0, §9.6) — Chromium only.
//
// Scope: boot reachable through the accessible control, layout identifiers
// present, harness can resize the viewport, §9.6.2 blank-canvas check, and
// the Phase −1 entrance-transform assertion and the Phase 2 initial-HTML
// links. The deck-overlap assertion (Phase 6) remains named pending work via
// test.fixme — never a passing baseline.
//
// Runs against a DEVELOPMENT server: __COCKPIT_TEST_HOOKS__ is compiled out
// of production bundles (components/cockpit/test-hooks.ts). Phase 8's
// production gate asserts the bridge is ABSENT from the production build.

import { expect, test, type Page } from '@playwright/test'

import { DPR_CAP } from '../lib/responsive/render-policy'
import { ciTimeout, resolveE2eTiming } from '../scripts/e2e-policy'

const timing = resolveE2eTiming()

type MainRendererSnapshot = {
  stageWidth: number
  stageHeight: number
  canvasWidth: number
  canvasHeight: number
  bufferWidth: number
  bufferHeight: number
  cameraAspect: number
  rendererPixelRatio: number
  devicePixelRatio: number
}

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    errors.push(`console.error: ${text}`)
  })
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  return errors
}

async function waitForTestHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: timing.transition,
  })
}

/** skipIntro + wait for the scene to mount and settle at cockpit rest. */
async function enterCockpitDirect(page: Page): Promise<void> {
  await waitForTestHooks(page)
  await page.evaluate((timeoutMs) => {
    window.__COCKPIT_TEST_HOOKS__!.configureSettleTimeout(timeoutMs)
  }, timing.settle)
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: timing.transition },
  )
  // Let decal/texture rasterization land a few frames before pixel checks.
  await page.waitForTimeout(1_500)
}

async function getMainRendererSnapshot(page: Page): Promise<MainRendererSnapshot | null> {
  return page.evaluate(() => {
    const w = window as Window & {
      __cockpitRenderer?: {
        domElement: HTMLCanvasElement
        getPixelRatio(): number
      } | null
      __cockpitCamera?: { aspect: number } | null
    }
    const stage = document.querySelector<HTMLElement>('[data-layout-region="cockpit-stage"]')
    const renderer = w.__cockpitRenderer
    const camera = w.__cockpitCamera
    if (!stage || !renderer || !camera) return null

    const stageRect = stage.getBoundingClientRect()
    const canvasRect = renderer.domElement.getBoundingClientRect()
    return {
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      bufferWidth: renderer.domElement.width,
      bufferHeight: renderer.domElement.height,
      cameraAspect: camera.aspect,
      rendererPixelRatio: renderer.getPixelRatio(),
      devicePixelRatio: window.devicePixelRatio,
    }
  })
}

function mainRendererMatches(snapshot: MainRendererSnapshot | null): boolean {
  if (!snapshot || snapshot.stageWidth <= 0 || snapshot.stageHeight <= 0) return false
  const expectedDpr = Math.min(snapshot.devicePixelRatio, DPR_CAP)
  return (
    Math.abs(snapshot.cameraAspect - snapshot.stageWidth / snapshot.stageHeight) <= 0.001 &&
    Math.abs(snapshot.canvasWidth - snapshot.stageWidth) <= 1 &&
    Math.abs(snapshot.canvasHeight - snapshot.stageHeight) <= 1 &&
    Math.abs(snapshot.rendererPixelRatio - expectedDpr) <= Number.EPSILON &&
    Math.abs(snapshot.bufferWidth - Math.floor(snapshot.stageWidth * expectedDpr)) <= 1 &&
    Math.abs(snapshot.bufferHeight - Math.floor(snapshot.stageHeight * expectedDpr)) <= 1
  )
}

async function expectMainRendererSized(page: Page): Promise<MainRendererSnapshot> {
  await expect
    .poll(async () => mainRendererMatches(await getMainRendererSnapshot(page)), {
      timeout: timing.expect,
    })
    .toBe(true)

  const snapshot = await getMainRendererSnapshot(page)
  expect(snapshot, 'renderer/camera/stage bridge missing').not.toBeNull()
  expect(mainRendererMatches(snapshot)).toBe(true)
  return snapshot!
}

async function readMainCanvasMetrics(page: Page): Promise<{
  distinctColors: number
  dominantShare: number
  nonDominantFraction: number
  bufferWidth: number
  bufferHeight: number
} | null> {
  return page.evaluate(() => {
    const w = window as Window & {
      __cockpitRenderer?: {
        domElement: HTMLCanvasElement
        render: (scene: unknown, camera: unknown) => void
      } | null
      __cockpitScene?: unknown
      __cockpitCamera?: unknown
    }
    const renderer = w.__cockpitRenderer
    if (!renderer || !w.__cockpitScene || !w.__cockpitCamera) return null
    renderer.render(w.__cockpitScene, w.__cockpitCamera)
    const source = renderer.domElement

    const probeWidth = 160
    const probeHeight = Math.max(1, Math.round((source.height / source.width) * probeWidth))
    const probe = document.createElement('canvas')
    probe.width = probeWidth
    probe.height = probeHeight
    const context = probe.getContext('2d')
    if (!context) return null
    context.drawImage(source, 0, 0, probeWidth, probeHeight)
    const { data } = context.getImageData(0, 0, probeWidth, probeHeight)

    const counts = new Map<number, number>()
    for (let index = 0; index < data.length; index += 4) {
      const key =
        ((data[index]! >> 4) << 8) |
        ((data[index + 1]! >> 4) << 4) |
        (data[index + 2]! >> 4)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const total = probeWidth * probeHeight
    let dominant = 0
    for (const count of counts.values()) dominant = Math.max(dominant, count)
    return {
      distinctColors: counts.size,
      dominantShare: dominant / total,
      nonDominantFraction: 1 - dominant / total,
      bufferWidth: source.width,
      bufferHeight: source.height,
    }
  })
}

async function expectMainCanvasNotBlank(page: Page): Promise<void> {
  const metrics = await readMainCanvasMetrics(page)
  expect(metrics, 'renderer/scene/camera bridge missing').not.toBeNull()
  expect(metrics!.bufferWidth).toBeGreaterThan(0)
  expect(metrics!.bufferHeight).toBeGreaterThan(0)
  expect(metrics!.distinctColors).toBeGreaterThanOrEqual(8)
  expect(metrics!.dominantShare).toBeLessThan(0.98)
  expect(metrics!.nonDominantFraction).toBeGreaterThan(0.02)
}

async function enterWarpViaBoot(page: Page, warpTimeScale: number): Promise<void> {
  await page.goto('/')
  const enter = page.getByRole('button', { name: /enter the room/i })
  await expect(enter).toBeVisible({ timeout: 45_000 })
  await page.evaluate((scale) => {
    const w = window as Window & {
      __phase3WarpSeen?: boolean
      __warpTimeScale?: number
    }
    w.__warpTimeScale = scale
    w.__phase3WarpSeen = Boolean(document.querySelector('[data-screen-label="00b Warp"]'))
    if (!w.__phase3WarpSeen) {
      const observer = new MutationObserver(() => {
        if (!document.querySelector('[data-screen-label="00b Warp"]')) return
        w.__phase3WarpSeen = true
        observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }
  }, warpTimeScale)
  await enter.click()
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as Window & { __phase3WarpSeen?: boolean }).__phase3WarpSeen === true,
        ),
      { timeout: 45_000 },
    )
    .toBe(true)
  await expect(page.locator('[data-screen-label="00b Warp"]')).toBeVisible({ timeout: 45_000 })
}

type RendererCallCounts = {
  setPixelRatio: number
  setSize: number
}

async function installRendererCallProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as Window & {
      __cockpitRenderer?: {
        setPixelRatio(value: number): void
        setSize(width: number, height: number, updateStyle?: boolean): void
      } | null
      __phase3RendererCallProbe?: { read(): RendererCallCounts }
    }
    const renderer = w.__cockpitRenderer
    if (!renderer) throw new Error('main renderer is not ready')

    const calls: RendererCallCounts = {
      setPixelRatio: 0,
      setSize: 0,
    }
    const setPixelRatio = renderer.setPixelRatio.bind(renderer)
    const setSize = renderer.setSize.bind(renderer)

    renderer.setPixelRatio = (value: number): void => {
      calls.setPixelRatio += 1
      setPixelRatio(value)
    }
    renderer.setSize = (width: number, height: number, updateStyle?: boolean): void => {
      calls.setSize += 1
      setSize(width, height, updateStyle)
    }
    w.__phase3RendererCallProbe = { read: () => ({ ...calls }) }
  })
}

async function readRendererCallProbe(page: Page): Promise<RendererCallCounts> {
  return page.evaluate(() => {
    const probe = (
      window as Window & {
        __phase3RendererCallProbe?: { read(): RendererCallCounts }
      }
    ).__phase3RendererCallProbe
    if (!probe) throw new Error('renderer call probe is not installed')
    return probe.read()
  })
}

function expectRectsUnchanged(
  before: { x: number; y: number; w: number; h: number },
  after: { x: number; y: number; w: number; h: number },
  label: string,
): void {
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    expect(Math.abs(after[key] - before[key]), `${label}.${key} moved on DPR-only change`).toBeLessThan(
      0.25,
    )
  }
}

type WarpRendererSnapshot = {
  hostWidth: number
  hostHeight: number
  canvasWidth: number
  canvasHeight: number
  bufferWidth: number
  bufferHeight: number
  projectionAspect: number | null
  devicePixelRatio: number
}

async function getWarpRendererSnapshot(page: Page): Promise<WarpRendererSnapshot | null> {
  return page.evaluate(() => {
    const warp = document.querySelector<HTMLElement>('[data-screen-label="00b Warp"]')
    const canvas = warp?.querySelector('canvas')
    const host = canvas?.parentElement
    if (!canvas || !host) return null

    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    let projectionAspect: number | null = null
    if (context) {
      const program = context.getParameter(context.CURRENT_PROGRAM) as WebGLProgram | null
      const location = program ? context.getUniformLocation(program, 'projectionMatrix') : null
      const matrix = program && location ? context.getUniform(program, location) : null
      if (matrix instanceof Float32Array && matrix[0] && matrix[5]) {
        projectionAspect = Math.abs(matrix[5] / matrix[0])
      }
    }

    const hostRect = host.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    return {
      hostWidth: hostRect.width,
      hostHeight: hostRect.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      bufferWidth: canvas.width,
      bufferHeight: canvas.height,
      projectionAspect,
      devicePixelRatio: window.devicePixelRatio,
    }
  })
}

function warpRendererMatches(snapshot: WarpRendererSnapshot | null): boolean {
  if (
    !snapshot ||
    snapshot.hostWidth <= 0 ||
    snapshot.hostHeight <= 0 ||
    snapshot.projectionAspect === null
  ) {
    return false
  }
  const expectedDpr = Math.min(snapshot.devicePixelRatio, DPR_CAP)
  return (
    Math.abs(snapshot.projectionAspect - snapshot.hostWidth / snapshot.hostHeight) <= 0.001 &&
    Math.abs(snapshot.canvasWidth - snapshot.hostWidth) <= 1 &&
    Math.abs(snapshot.canvasHeight - snapshot.hostHeight) <= 1 &&
    Math.abs(snapshot.bufferWidth - Math.floor(snapshot.hostWidth * expectedDpr)) <= 1 &&
    Math.abs(snapshot.bufferHeight - Math.floor(snapshot.hostHeight * expectedDpr)) <= 1
  )
}

async function expectWarpRendererSized(page: Page): Promise<WarpRendererSnapshot> {
  await expect
    .poll(async () => warpRendererMatches(await getWarpRendererSnapshot(page)), {
      timeout: timing.expect,
    })
    .toBe(true)
  const snapshot = await getWarpRendererSnapshot(page)
  expect(snapshot, 'warp renderer/host missing').not.toBeNull()
  expect(warpRendererMatches(snapshot)).toBe(true)
  return snapshot!
}

test.describe('phase 0 smoke', () => {
  test('boot screen is reachable and carries the layout identifiers', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')

    await expect(page.locator('[data-layout-region="boot"]')).toBeVisible()
    // App-shell identifiers exist before any interaction (§8 item 2).
    await expect(page.locator('[data-layout-region="app-shell"]')).toBeAttached()
    await expect(page.locator('[data-content-contract="content-home-v1"]')).toBeAttached()

    // The boot gate is operable through its accessible role/name (§9.6 —
    // no hard-coded click coordinates anywhere in this suite).
    const enter = page.getByRole('button', { name: /enter the room/i })
    await expect(enter).toBeVisible({ timeout: 45_000 })
    await expect(page.locator('[data-hud="boot-enter"]')).toBeVisible()

    expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('cockpit mounts via the real boot control and declares its layout contract', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }) // skips the warp
    await page.goto('/')
    await page.getByRole('button', { name: /enter the room/i }).click({ timeout: 45_000 })

    const stage = page.locator('[data-layout-region="cockpit-stage"]')
    await expect(stage).toBeVisible({ timeout: timing.transition })
    // data-layout-contract must resolve to a registry contract id (§A.7);
    // unit tests hold the registry itself to validateLayoutContracts.
    await expect(stage).toHaveAttribute('data-layout-contract', 'cockpit-v1')
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('[data-hud="site-header"]')).toBeVisible()
  })

  test('renderer follows the stage at mount and across live resize', async ({ page }) => {
    await page.goto('/')
    await enterCockpitDirect(page)

    for (const viewport of [
      { width: 1024, height: 600 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      const snapshot = await expectMainRendererSized(page)
      expect(Math.abs(snapshot.stageWidth - viewport.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(snapshot.stageHeight - viewport.height)).toBeLessThanOrEqual(1)
      await expectMainCanvasNotBlank(page)
    }
  })

  test('§9.6.2 blank-canvas check: the frame actually rendered', async ({ page }) => {
    await page.goto('/')
    await enterCockpitDirect(page)

    // Phase 0 decision (§9.6.2): with preserveDrawingBuffer:false, read the
    // buffer via a synchronous in-frame forced re-render — render then
    // toDataURL in the same JS task, before the buffer is cleared. The flag
    // is never flipped in production.
    await expectMainCanvasNotBlank(page)
  })

  test('DPR-only change updates the buffer once without moving CSS geometry', async ({
    page,
    context,
  }) => {
    const cdp = await context.newCDPSession(page)
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await page.goto('/')
      await enterCockpitDirect(page)
      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))

      const beforeRenderer = await expectMainRendererSized(page)
      const beforeState = await page.evaluate(() =>
        window.__COCKPIT_TEST_HOOKS__!.getRendererState(),
      )
      const beforeHud = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot())
      expect(beforeHud.subject).not.toBeNull()
      expect(beforeHud.overlays['return-control']).toBeDefined()
      expect(beforeState.main).not.toBeNull()

      await installRendererCallProbe(page)
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 2,
        mobile: false,
      })

      await expect
        .poll(async () => (await getMainRendererSnapshot(page))?.rendererPixelRatio, {
          timeout: timing.expect,
        })
        .toBe(2)

      const afterRenderer = await expectMainRendererSized(page)
      const afterState = await page.evaluate(() =>
        window.__COCKPIT_TEST_HOOKS__!.getRendererState(),
      )
      const afterHud = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot())
      const calls = await readRendererCallProbe(page)

      expect(calls.setPixelRatio).toBe(1)
      expect(afterState.main).not.toBeNull()
      expect(afterState.main!.sizeVersion).toBe(beforeState.main!.sizeVersion + 1)
      expect(
        Math.abs(afterRenderer.bufferWidth - beforeRenderer.bufferWidth * 2),
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(afterRenderer.bufferHeight - beforeRenderer.bufferHeight * 2),
      ).toBeLessThanOrEqual(1)
      expect(afterRenderer.canvasWidth).toBeCloseTo(beforeRenderer.canvasWidth, 6)
      expect(afterRenderer.canvasHeight).toBeCloseTo(beforeRenderer.canvasHeight, 6)
      expect(afterRenderer.cameraAspect).toBeCloseTo(beforeRenderer.cameraAspect, 12)

      expect(afterHud.subject).not.toBeNull()
      expect(afterHud.overlays['return-control']).toBeDefined()
      expectRectsUnchanged(beforeHud.subject!, afterHud.subject!, 'subject')
      expectRectsUnchanged(
        beforeHud.overlays['return-control']!,
        afterHud.overlays['return-control']!,
        'return-control',
      )
    } finally {
      await cdp.send('Emulation.clearDeviceMetricsOverride')
    }
  })

  test('zero-size mount observations are inert and the next valid box applies', async ({
    page,
  }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await enterCockpitDirect(page)
    const before = await expectMainRendererSized(page)

    const invalidState = await page.evaluate(async () => {
      const w = window as Window & {
        __cockpitRenderer?: { domElement: HTMLCanvasElement } | null
        __cockpitCamera?: {
          aspect: number
          projectionMatrix: { elements: ArrayLike<number> }
        } | null
      }
      const mount = w.__cockpitRenderer?.domElement.parentElement
      const camera = w.__cockpitCamera
      if (!mount || !camera) return null
      mount.style.display = 'none'
      window.dispatchEvent(new Event('resize'))
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      return {
        aspect: camera.aspect,
        projectionFinite: Array.from(camera.projectionMatrix.elements).every(Number.isFinite),
        mountWidth: mount.getBoundingClientRect().width,
        mountHeight: mount.getBoundingClientRect().height,
      }
    })

    expect(invalidState).not.toBeNull()
    expect(invalidState!.mountWidth).toBe(0)
    expect(invalidState!.mountHeight).toBe(0)
    expect(invalidState!.aspect).toBe(before.cameraAspect)
    expect(Number.isFinite(invalidState!.aspect)).toBe(true)
    expect(invalidState!.projectionFinite).toBe(true)

    await page.setViewportSize({ width: 1024, height: 600 })
    await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __cockpitRenderer?: { domElement: HTMLCanvasElement } | null
        }
      ).__cockpitRenderer
      const mount = renderer?.domElement.parentElement
      if (!mount) throw new Error('main renderer mount missing')
      mount.style.removeProperty('display')
      window.dispatchEvent(new Event('resize'))
    })

    const restored = await expectMainRendererSized(page)
    expect(restored.stageWidth).toBeCloseTo(1024, 0)
    expect(restored.stageHeight).toBeCloseTo(600, 0)
    await expectMainCanvasNotBlank(page)
    expect(errors, `unexpected page errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('unchanged resize events cause no renderer sizing churn', async ({ page }) => {
    await page.goto('/')
    await enterCockpitDirect(page)
    await expectMainRendererSized(page)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
    await expect(page.locator('[data-hud="return-control"]')).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    await installRendererCallProbe(page)
    const stateBefore = await page.evaluate(() =>
      window.__COCKPIT_TEST_HOOKS__!.getRendererState(),
    )

    const memoryBefore = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __cockpitRenderer?: {
            info: { memory: { geometries: number; textures: number } }
          } | null
        }
      ).__cockpitRenderer
      return renderer ? { ...renderer.info.memory } : null
    })

    await page.evaluate(async () => {
      for (let index = 0; index < 20; index += 1) {
        window.dispatchEvent(new Event('resize'))
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
    })

    const calls = await readRendererCallProbe(page)
    const stateAfter = await page.evaluate(() =>
      window.__COCKPIT_TEST_HOOKS__!.getRendererState(),
    )
    const memoryAfter = await page.evaluate(() => {
      const renderer = (
        window as Window & {
          __cockpitRenderer?: {
            info: { memory: { geometries: number; textures: number } }
          } | null
        }
      ).__cockpitRenderer
      return renderer ? { ...renderer.info.memory } : null
    })

    expect(calls).toEqual({
      setPixelRatio: 0,
      setSize: 0,
    })
    expect(stateAfter.main?.sizeVersion).toBe(stateBefore.main?.sizeVersion)
    expect(memoryBefore).not.toBeNull()
    expect(memoryAfter).toEqual(memoryBefore)
  })

  test('warp renderer follows its host box and live viewport changes', async ({ page }) => {
    test.setTimeout(ciTimeout(120_000, 600_000))
    await enterWarpViaBoot(page, 100)

    const initial = await expectWarpRendererSized(page)
    expect(initial.hostWidth).toBeCloseTo(1440, 0)
    expect(initial.hostHeight).toBeCloseTo(900, 0)

    // A host-only change proves the renderer measures its mount rather than
    // window.innerWidth/window.innerHeight.
    await page.evaluate(() => {
      const host = document.querySelector('[data-screen-label="00b Warp"] canvas')?.parentElement
      if (!host) throw new Error('warp host missing')
      host.style.right = '137px'
    })
    const hostOnly = await expectWarpRendererSized(page)
    expect(hostOnly.hostWidth).toBeCloseTo(1440 - 137, 0)
    expect(hostOnly.hostHeight).toBeCloseTo(900, 0)

    await page.evaluate(() => {
      const host = document.querySelector('[data-screen-label="00b Warp"] canvas')?.parentElement
      if (!host) throw new Error('warp host missing')
      host.style.right = '0px'
    })
    await page.setViewportSize({ width: 1024, height: 600 })
    const resized = await expectWarpRendererSized(page)
    expect(resized.hostWidth).toBeCloseTo(1024, 0)
    expect(resized.hostHeight).toBeCloseTo(600, 0)
  })

  test('warp catch path removes the size controller resize listener', async ({ page }) => {
    test.setTimeout(ciTimeout(120_000, 600_000))
    await page.goto('/')
    const enter = page.getByRole('button', { name: /enter the room/i })
    await expect(enter).toBeVisible({ timeout: 45_000 })

    await page.evaluate(() => {
      type Listener = EventListenerOrEventListenerObject
      type CatchProbe = {
        read(): {
          thrown: boolean
          candidateCaptured: boolean
          candidateActive: boolean
          candidateRemoved: boolean
        }
      }
      const w = window as Window & {
        __warpTimeScale?: number
        __phase3WarpCatchProbe?: CatchProbe
      }
      w.__warpTimeScale = 0.2

      const nativeAdd = window.addEventListener.bind(window)
      const nativeRemove = window.removeEventListener.bind(window)
      const nativeRaf = window.requestAnimationFrame.bind(window)
      const NativeResizeObserver = window.ResizeObserver
      const activeResize = new Set<Listener>()
      const removedResize = new Set<Listener>()
      let latestResize: Listener | null = null
      let warpResize: Listener | null = null
      let candidate: Listener | null = null
      let thrown = false

      window.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ): void => {
        if (type === 'resize' && listener) {
          activeResize.add(listener)
          latestResize = listener
        }
        if (listener) nativeAdd(type, listener, options)
      }) as typeof window.addEventListener

      window.removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ): void => {
        if (type === 'resize' && listener) {
          activeResize.delete(listener)
          removedResize.add(listener)
        }
        if (listener) nativeRemove(type, listener, options)
      }) as typeof window.removeEventListener

      window.ResizeObserver = class {
        readonly inner: ResizeObserver

        constructor(callback: ResizeObserverCallback) {
          this.inner = new NativeResizeObserver(callback)
        }

        observe(target: Element, options?: ResizeObserverOptions): void {
          if (target.closest('[data-screen-label="00b Warp"]')) {
            warpResize = latestResize
          }
          this.inner.observe(target, options)
        }

        unobserve(target: Element): void {
          this.inner.unobserve(target)
        }

        disconnect(): void {
          this.inner.disconnect()
        }
      } as typeof ResizeObserver

      window.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
        if (!thrown && warpResize) {
          thrown = true
          candidate = warpResize
          throw new Error('phase3 intentional warp setup failure')
        }
        return nativeRaf(callback)
      }) as typeof window.requestAnimationFrame

      w.__phase3WarpCatchProbe = {
        read: () => ({
          thrown,
          candidateCaptured: candidate !== null,
          candidateActive: candidate !== null && activeResize.has(candidate),
          candidateRemoved: candidate !== null && removedResize.has(candidate),
        }),
      }
    })

    await enter.click()
    await page.waitForFunction(
      () =>
        (
          window as Window & {
            __phase3WarpCatchProbe?: { read(): { thrown: boolean } }
          }
        ).__phase3WarpCatchProbe?.read().thrown === true,
      undefined,
      { timeout: timing.expect },
    )

    const probe = await page.evaluate(() => {
      const value = (
        window as Window & {
          __phase3WarpCatchProbe?: {
            read(): {
              thrown: boolean
              candidateCaptured: boolean
              candidateActive: boolean
              candidateRemoved: boolean
            }
          }
        }
      ).__phase3WarpCatchProbe
      if (!value) throw new Error('warp catch probe missing')
      return value.read()
    })

    expect(probe).toEqual({
      thrown: true,
      candidateCaptured: true,
      candidateActive: false,
      candidateRemoved: true,
    })
    await expect(page.locator('[data-screen-label="00b Warp"]')).toHaveCount(0, {
      timeout: timing.expect,
    })
    await expect(page.locator('[data-layout-region="cockpit-stage"] canvas')).toBeVisible()
  })

  test('Phase −1: entrance animation never moves the positioning anchor', async ({ page }) => {
    test.setTimeout(ciTimeout(180_000, 600_000))
    await page.goto('/')
    await enterCockpitDirect(page)

    // All three Phase −1 sites (VinylInfoCard, arrows, hint) mount ONLY
    // while a record is selected — plain crate entry shows none of them.
    // Enter crate, then use the deterministic selection (legacy pull-out
    // state, no deck flight) so the overlays mount fresh and STAY mounted.
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))

    // The assertion is TRANSFORM STABILITY on the outer anchor while the
    // inner element animates — elapsed wall-clock time is not the property
    // under test. Pause the entrance and drive its Web Animations clock to
    // start/mid/end explicitly. This preserves the Phase −1 acceptance
    // criterion without depending on SwiftShader's frame rate.
    const ENTRANCE_MS = 3_000
    await page.addStyleTag({
      content:
        '[data-hud="vinyl-info-card"] > div, [data-hud="browse-arrow-prev"] > div, ' +
        '[data-hud="browse-arrow-next"] > div, [data-hud="browse-hint"] > div ' +
        `{ animation-duration: ${ENTRANCE_MS}ms !important; ` +
        'animation-play-state: paused !important; }',
    })

    const names = [
      'vinyl-info-card',
      'browse-arrow-prev',
      'browse-arrow-next',
      'browse-hint',
    ] as const
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.selectRecord(0))
    await page.waitForFunction(
      (hudNames) => hudNames.every((name) => document.querySelector(`[data-hud="${name}"]`)),
      names,
      { timeout: ciTimeout(60_000, 90_000) },
    )

    const sampled = await page.evaluate(
      ({ entranceMs, hudNames }) => {
        const positions = [
          { phase: 'start', time: 1 },
          { phase: 'mid', time: entranceMs / 2 },
          { phase: 'end', time: entranceMs - 1 },
        ] as const

        return Object.fromEntries(
          hudNames.map((name) => {
            const outer = document.querySelector<HTMLElement>(`[data-hud="${name}"]`)
            const inner = outer?.firstElementChild
            if (!outer || !(inner instanceof HTMLElement)) {
              return [name, null]
            }

            const innerAnimationName = getComputedStyle(inner).animationName
            const entrance = inner.getAnimations().find((animation) => {
              const namedAnimation = animation as Animation & { animationName?: string }
              return namedAnimation.animationName?.includes('termFadeIn')
            })
            if (!entrance) {
              return [name, { innerAnimationName, samples: [] }]
            }

            entrance.pause()
            const samples = positions.map(({ phase, time }) => {
              entrance.currentTime = time
              return {
                phase,
                outerTransform: getComputedStyle(outer).transform,
                innerTransform: getComputedStyle(inner).transform,
                innerOpacity: Number(getComputedStyle(inner).opacity),
              }
            })
            return [name, { innerAnimationName, samples }]
          }),
        )
      },
      { entranceMs: ENTRANCE_MS, hudNames: names },
    )

    for (const name of names) {
      const record = sampled[name]
      expect(record, `overlay [data-hud="${name}"] never appeared`).toBeTruthy()
      // Prove the entrance animation actually ran on the INNER element —
      // otherwise transform stability would pass vacuously.
      expect(record!.innerAnimationName, `${name}: inner entrance animation missing`).toContain(
        'termFadeIn',
      )
      expect(
        record!.samples.map((sample) => sample.phase),
        `${name}: start/mid/end samples missing`,
      ).toEqual(['start', 'mid', 'end'])
      expect(
        new Set(record!.samples.map((sample) => sample.innerTransform)).size,
        `${name}: inner entrance animation did not advance`,
      ).toBeGreaterThan(1)
      expect(
        record!.samples[0]!.innerOpacity,
        `${name}: inner entrance opacity did not advance`,
      ).toBeLessThan(record!.samples[2]!.innerOpacity)
      const uniqueTransforms = new Set(
        record!.samples.map((sample) => sample.outerTransform),
      )
      expect(
        [...uniqueTransforms],
        `${name}: outer anchor transform changed during entrance`,
      ).toHaveLength(1)
    }
  })

  test('§9.6.1 lifecycle guard: configureVisualCapture is pre-scene only', async ({ page }) => {
    await page.goto('/')
    await waitForTestHooks(page)

    // Valid pre-scene configuration is accepted (reserved for Phase 4's
    // seeded streams + frozen clock).
    await page.evaluate(() =>
      window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture({
        seed: 'phase0-smoke',
        timeMs: 1_000,
        pauseAmbient: true,
      }),
    )

    // Malformed config throws (shape is validated, not silently stored).
    const badShapeError = await page.evaluate(() => {
      const hooks = window.__COCKPIT_TEST_HOOKS__! as unknown as {
        configureVisualCapture(config: unknown): void
      }
      try {
        hooks.configureVisualCapture({ seed: '', timeMs: Number.NaN, pauseAmbient: false })
        return null
      } catch (error) {
        return String(error)
      }
    })
    expect(badShapeError).toContain('configureVisualCapture')

    // After skipIntro()/scene construction the guard must throw — a seed
    // injected late cannot reach already-built geometry (§9.6.5).
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
    await expect(page.locator('canvas')).toBeVisible()
    const lateError = await page.evaluate(() => {
      try {
        window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture({
          seed: 'too-late',
          timeMs: 0,
          pauseAmbient: true,
        })
        return null
      } catch (error) {
        return String(error)
      }
    })
    expect(lateError).toContain('before skipIntro')
  })

  test('initial HTML links to /projects and /about before hydration (Phase 2)', async ({
    page,
  }) => {
    const response = await page.request.get('/')
    const html = await response.text()
    expect(html).toContain('href="/projects"')
    expect(html).toContain('href="/about"')
  })

  // ── Named pending work — never recorded as passing (§8 Phase 0) ────────

  // Phase 6 (plan §8 Phase 6 / §2.1): the deck browse hint overlaps the
  // holographic project card on shorter viewports. Deliberately NOT
  // stopgapped; the real solver fixes it. This must never be inverted into
  // a passing baseline.
  test.fixme(
    'deck browse hint does not overlap the holographic project card on short viewports (Phase 6)',
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/')
      await enterCockpitDirect(page)
      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
      const snapshot = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot())
      const hint = snapshot.overlays['browse-hint']
      const card = snapshot.subject
      expect(hint && card).toBeTruthy()
      const separated =
        hint!.y + hint!.h <= card!.y || hint!.y >= card!.y + card!.h ||
        hint!.x + hint!.w <= card!.x || hint!.x >= card!.x + card!.w
      expect(separated, 'hint intersects the holographic card').toBe(true)
    },
  )
})
