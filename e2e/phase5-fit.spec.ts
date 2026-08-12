import { expect, test, type Page } from '@playwright/test'

import { REQUIRED_VIEWPORT_CASES } from '../lib/responsive/layout-contract'
import { ciTimeout, resolveE2eTiming } from '../scripts/e2e-policy'

const timing = resolveE2eTiming()
const CAPTURE = {
  seed: 'ax-cockpit-phase5-fit-v1',
  timeMs: 12_000,
  pauseAmbient: true as const,
}

async function enterCockpit(page: Page, capture = true): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem('cockpit-intro-complete-v1')
    window.localStorage.setItem('cockpit-theme', 'dark')
  })
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: timing.transition,
  })
  await page.evaluate(async () => document.fonts.ready)
  await page.evaluate(({ timeoutMs, visualCapture }) => {
    const hooks = window.__COCKPIT_TEST_HOOKS__!
    hooks.configureSettleTimeout(timeoutMs)
    if (visualCapture) hooks.configureVisualCapture(visualCapture)
    hooks.skipIntro()
  }, { timeoutMs: timing.settle, visualCapture: capture ? CAPTURE : null })
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await expect.poll(
    () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status),
    { timeout: timing.transition },
  ).toBe('ready')
}

async function enterView(page: Page, kind: 'monitor' | 'deck' | 'crate') {
  await page.evaluate((mode) => window.__COCKPIT_TEST_HOOKS__!.enterView(mode), kind)
  await expect.poll(
    () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
    { timeout: timing.settle },
  ).toBe(true)
  const fit = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit())
  expect(fit).not.toBeNull()
  expect(fit!.status).toBe('fit')
  return fit!
}

function expectPointsInside(
  fit: NonNullable<Awaited<ReturnType<typeof enterView>>>,
  tolerance = 0.5,
): void {
  const { safeFrame } = fit
  for (const [index, point] of fit.points.entries()) {
    expect(point.x, `point ${index} left`).toBeGreaterThanOrEqual(safeFrame.x - tolerance)
    expect(point.x, `point ${index} right`).toBeLessThanOrEqual(
      safeFrame.x + safeFrame.w + tolerance,
    )
    expect(point.y, `point ${index} top`).toBeGreaterThanOrEqual(safeFrame.y - tolerance)
    expect(point.y, `point ${index} bottom`).toBeLessThanOrEqual(
      safeFrame.y + safeFrame.h + tolerance,
    )
  }
}

function expectOverlayGeometryClose(
  before: Record<string, { x: number; y: number; w: number; h: number }>,
  after: Record<string, { x: number; y: number; w: number; h: number }>,
  tolerance = 0.25,
): void {
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort())
  for (const [id, rect] of Object.entries(before)) {
    const next = after[id]
    expect(next, id).toBeDefined()
    expect(Math.abs(next!.x - rect.x), `${id} x`).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(next!.y - rect.y), `${id} y`).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(next!.w - rect.w), `${id} w`).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(next!.h - rect.h), `${id} h`).toBeLessThanOrEqual(tolerance)
  }
}

async function observeFrames(page: Page, count: number): Promise<void> {
  const start = await page.evaluate(
    () => window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta().computeCount,
  )
  await page.waitForFunction(
    ({ initial, frames }) =>
      window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta().computeCount >= initial + frames,
    { initial: start, frames: count },
    { polling: 50, timeout: timing.frameObservation },
  )
}

async function armPendingMeasurementFont(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = window as unknown as { __phase5PendingFont?: FontFace }
    const face = new FontFace(
      'Phase5 Pending Measurement',
      'url(/phase5-pending-measurement.woff2)',
    )
    runtime.__phase5PendingFont = face
    document.fonts.add(face)
    void face.load().catch(() => {})
  })
  await expect.poll(
    () => page.evaluate(() => document.fonts.status),
    { timeout: timing.expect },
  ).toBe('loading')
}

async function releasePendingMeasurementFont(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = window as unknown as { __phase5PendingFont?: FontFace }
    if (runtime.__phase5PendingFont) document.fonts.delete(runtime.__phase5PendingFont)
    runtime.__phase5PendingFont = undefined
  })
}

async function sampleModeSwitch(
  page: Page,
  kind: 'monitor' | 'deck' | 'crate',
): Promise<Array<{ t: number; x: number; y: number; z: number; settled: boolean }>> {
  await page.evaluate(async (mode) => {
    type Sample = { t: number; x: number; y: number; z: number; settled: boolean }
    const runtime = window as unknown as {
      __cockpitCamera?: { position: { x: number; y: number; z: number } } | null
      __phase5ModeSampling?: boolean
      __phase5ModeSamples?: Sample[]
    }
    runtime.__phase5ModeSamples = []
    runtime.__phase5ModeSampling = true
    const pushSample = () => {
      const camera = runtime.__cockpitCamera
      if (camera) runtime.__phase5ModeSamples!.push({
        t: performance.now(),
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        settled: window.__COCKPIT_TEST_HOOKS__!.isSettled(),
      })
    }
    const sample = () => {
      if (!runtime.__phase5ModeSampling) return
      pushSample()
      requestAnimationFrame(sample)
    }
    // Use the bridge's three-consecutive-frame settle barrier. A host-side
    // poll can otherwise observe the previous mode's final settled frame
    // before the first frame of this switch reports its in-flight state. Arm
    // the switch immediately after the renderer's current rAF so its next
    // THREE.Clock delta and the sampled wall-clock interval share a start.
    await new Promise<void>((resolve, reject) => {
      requestAnimationFrame(() => {
        pushSample()
        requestAnimationFrame(sample)
        window.__COCKPIT_TEST_HOOKS__!.enterView(mode).then(resolve, reject)
      })
    })
  }, kind)
  return page.evaluate(() => {
    const runtime = window as unknown as {
      __phase5ModeSampling?: boolean
      __phase5ModeSamples?: Array<{
        t: number; x: number; y: number; z: number; settled: boolean
      }>
    }
    runtime.__phase5ModeSampling = false
    return runtime.__phase5ModeSamples ?? []
  })
}

function expectModeSwitchUnchanged(
  samples: Array<{ t: number; x: number; y: number; z: number; settled: boolean }>,
  durationS: number,
): void {
  expect(samples.length).toBeGreaterThan(1)
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  const path = {
    x: last.x - first.x,
    y: last.y - first.y,
    z: last.z - first.z,
  }
  const pathLength = Math.hypot(path.x, path.y, path.z)
  expect(pathLength).toBeGreaterThan(0.05)

  let previousProgress = -0.01
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!
    const current = samples[index]!
    const progress = (
      (current.x - first.x) * path.x +
      (current.y - first.y) * path.y +
      (current.z - first.z) * path.z
    ) / (pathLength * pathLength)
    expect(progress).toBeGreaterThanOrEqual(previousProgress - 0.01)
    previousProgress = progress

    const step = Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
      current.z - previous.z,
    )
    const dtS = (current.t - previous.t) / 1000
    const analyticFrameBound = Math.min(
      pathLength,
      2 * pathLength * dtS / durationS + 0.05,
    )
    expect(
      step,
      `sample=${index} dt=${dtS.toFixed(4)} path=${pathLength.toFixed(4)} ` +
        `progress=${progress.toFixed(4)} previousProgress=${previousProgress.toFixed(4)}`,
    ).toBeLessThanOrEqual(analyticFrameBound)
  }
}

test.describe('Phase 5 focus-camera fit integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/phase5-pending-measurement.woff2', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      await route.abort('timedout').catch(() => {})
    })
  })
  test('AC-3: every authored point fits the safe frame across FIT-MATRIX', async ({ page }) => {
    test.setTimeout(ciTimeout(300_000, 1_200_000))
    await enterCockpit(page, true)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    let cratePreviewPrimed = false

    for (const viewport of REQUIRED_VIEWPORT_CASES) {
      await page.setViewportSize({ width: viewport.w, height: viewport.h })
      const stage = page.locator('[data-layout-region="cockpit-stage"]')
      const box = await stage.boundingBox()
      expect(box, viewport.id).not.toBeNull()
      await page.mouse.move(
        Math.min(viewport.w - 1, box!.x + Math.max(1, box!.width - 1)),
        Math.max(1, box!.y + 1),
      )
      // In contained cases the pinned 1024×600 surface extends beyond the
      // physically visible container. Exercise the authored maximum-parallax
      // corner for both the current mousemove producer and Phase 5 step 4's
      // pointermove producer without changing either production path.
      await page.evaluate(() => {
        const stageNode = document.querySelector<HTMLElement>(
          '[data-layout-region="cockpit-stage"]',
        )!
        const rect = stageNode.getBoundingClientRect()
        const init = { clientX: rect.right - 1, clientY: rect.top + 1, bubbles: true }
        window.dispatchEvent(new MouseEvent('mousemove', init))
        window.dispatchEvent(new PointerEvent('pointermove', init))
      })

      for (const kind of ['monitor', 'crate', 'deck'] as const) {
        const fit = await test.step(`${viewport.id}: ${kind} fit`, () =>
          enterView(page, kind),
        )
        if (kind === 'crate' && !cratePreviewPrimed) {
          await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.selectRecord(1))
          await expect.poll(
            () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
            { timeout: timing.settle },
          ).toBe(true)
          cratePreviewPrimed = true
          const previewFit = await page.evaluate(
            () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit(),
          )
          expect(previewFit).not.toBeNull()
          expectPointsInside(previewFit!)
        }
        expect(fit.kind).toBe(kind)
        expectPointsInside(fit)
      }
    }
  })

  test('AC-5/6: DPR invariance and cache invalidation counts are exact', async ({ page }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))
    await enterCockpit(page, true)
    const first = await enterView(page, 'deck')
    expect(first.solveCount).toBeGreaterThanOrEqual(1)
    expect(first.solveCount).toBeLessThanOrEqual(2)
    await observeFrames(page, 60)
    const idle = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit())
    expect(idle!.solveCount).toBe(first.solveCount)
    const idleCamera = await page.evaluate(() => {
      const camera = (window as unknown as {
        __cockpitCamera?: { position: { x: number; y: number; z: number } }
      }).__cockpitCamera!
      return { ...camera.position }
    })
    await observeFrames(page, 10)
    const stableCamera = await page.evaluate(() => {
      const camera = (window as unknown as {
        __cockpitCamera?: { position: { x: number; y: number; z: number } }
      }).__cockpitCamera!
      return { ...camera.position }
    })
    expect(Math.hypot(
      stableCamera.x - idleCamera.x,
      stableCamera.y - idleCamera.y,
      stableCamera.z - idleCamera.z,
    )).toBeLessThanOrEqual(0.002)
    const idleHud = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot(),
    )

    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main?.dpr),
      { timeout: timing.transition },
    ).toBe(2)
    const dpr = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit())
    expect(dpr!.solveCount).toBe(idle!.solveCount)
    expect(dpr!.distance).toBe(idle!.distance)
    expect(dpr!.safeFrame).toEqual(idle!.safeFrame)
    const dprHud = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot(),
    )
    expectOverlayGeometryClose(idleHud.overlays, dprHud.overlays)
    for (let index = 0; index < idle!.points.length; index += 1) {
      expect(Math.abs(dpr!.points[index]!.x - idle!.points[index]!.x)).toBeLessThanOrEqual(0.25)
      expect(Math.abs(dpr!.points[index]!.y - idle!.points[index]!.y)).toBeLessThanOrEqual(0.25)
    }

    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main?.dpr),
      { timeout: timing.transition },
    ).toBe(1)

    const beforeResize = dpr!.solveCount
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.solveCount),
      { timeout: timing.transition },
    ).toBe(beforeResize + 1)

    const beforeText = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!.solveCount,
    )
    await page.evaluate(() => document.documentElement.setAttribute('data-a11y-text', 'large'))
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.solveCount),
      { timeout: timing.transition },
    ).toBe(beforeText + 1)

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))
    const beforeReentry = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.solveCount,
    )
    await enterView(page, 'deck')
    const reentry = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit())
    expect(reentry!.solveCount).toBe(beforeReentry)
  })

  test('AC-6: cancelled measurement generations obey all tombstone cleanup branches', async ({ page }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))

    // Completed focus→cockpit exit: the ease-out reads the tombstone without
    // solving, then the next entry treats it as absent and performs solve #1.
    await enterCockpit(page, true)
    await armPendingMeasurementFont(page)
    await page.evaluate(() => window.__setCockpitViewMode!('deck'))
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.kind),
      { timeout: timing.transition },
    ).toBe('deck')
    const completedEntry = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!,
    )
    const easingSnapshot = await page.evaluate(() => {
      window.__setCockpitViewMode!('cockpit')
      // Capture mode intentionally snaps modeT on the next animation frame.
      // Read in the transition task itself to pin the tombstone's permitted
      // focused-to-cockpit handoff without racing that capture-frame snap.
      return window.__COCKPIT_TEST_HOOKS__!.getFocusFit()
    })
    expect(easingSnapshot?.solveCount).toBe(completedEntry.solveCount)
    await releasePendingMeasurementFont(page)
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
      { timeout: timing.settle },
    ).toBe(true)
    const completedReentry = await enterView(page, 'deck')
    expect(completedReentry.solveCount).toBeGreaterThanOrEqual(completedEntry.solveCount + 1)
    expect(completedReentry.solveCount).toBeLessThanOrEqual(completedEntry.solveCount + 2)

    // Interrupted exit → different kind above the 0.3 threshold exercises
    // the reassignment branch (wasFocused is false; no pose capture).
    await enterCockpit(page, true)
    await armPendingMeasurementFont(page)
    await page.evaluate(() => window.__setCockpitViewMode!('crate'))
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.kind),
      { timeout: timing.transition },
    ).toBe('crate')
    const interruptedEntry = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!,
    )
    await page.evaluate(() => {
      window.__setCockpitViewMode!('cockpit')
      window.__setCockpitViewMode!('monitor')
    })
    await releasePendingMeasurementFont(page)
    const reassigned = await enterView(page, 'monitor')
    expect(reassigned.solveCount).toBeGreaterThan(interruptedEntry.solveCount)
    const interruptedReturn = await enterView(page, 'crate')
    expect(interruptedReturn.solveCount).toBeGreaterThanOrEqual(reassigned.solveCount + 1)
    expect(interruptedReturn.solveCount).toBeLessThanOrEqual(reassigned.solveCount + 2)

    // Same-kind interrupted re-entry replaces the non-reusable tombstone
    // atomically; the superseded generation cannot commit later.
    await enterCockpit(page, true)
    await armPendingMeasurementFont(page)
    await page.evaluate(() => window.__setCockpitViewMode!('monitor'))
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.kind),
      { timeout: timing.transition },
    ).toBe('monitor')
    const sameKindEntry = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!,
    )
    await page.evaluate(() => {
      window.__setCockpitViewMode!('cockpit')
      window.__setCockpitViewMode!('monitor')
    })
    await releasePendingMeasurementFont(page)
    const sameKindReentry = await enterView(page, 'monitor')
    expect(sameKindReentry.solveCount).toBeGreaterThanOrEqual(sameKindEntry.solveCount + 1)
    expect(sameKindReentry.solveCount).toBeLessThanOrEqual(sameKindEntry.solveCount + 2)
    await page.waitForTimeout(1_100)
    await observeFrames(page, 20)
    const afterLateCompletion = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!,
    )
    expect(afterLateCompletion.solveCount).toBe(sameKindReentry.solveCount)
  })

  test('AC-7/25: refits blend, degraded hints recover, and warning episodes dedupe', async ({ page }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning' && message.text().includes('[focus-fit] deck')) {
        warnings.push(message.text())
      }
    })
    await enterCockpit(page, false)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    await expect(page.locator('[data-hud="browse-hint"]')).toBeVisible()

    const beforeResize = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!.solveCount,
    )
    await page.evaluate(() => {
      type Sample = { t: number; x: number; y: number; z: number; settled: boolean }
      const runtime = window as unknown as {
        __cockpitCamera?: { position: { x: number; y: number; z: number } } | null
        __phase5FitSampling?: boolean
        __phase5FitSamples?: Sample[]
      }
      runtime.__phase5FitSamples = []
      runtime.__phase5FitSampling = true
      const sample = () => {
        if (!runtime.__phase5FitSampling) return
        const camera = runtime.__cockpitCamera
        if (camera) runtime.__phase5FitSamples!.push({
          t: performance.now(),
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
          settled: window.__COCKPIT_TEST_HOOKS__!.isSettled(),
        })
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await page.setViewportSize({ width: 1024, height: 600 })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.solveCount),
      { timeout: timing.transition },
    ).toBe(beforeResize + 1)
    // A stalled frame cannot consume the whole 0.6 s refit in one step.
    await page.evaluate(() => {
      const start = performance.now()
      while (performance.now() - start < 650) {
        // Deliberately block the main thread to deliver one oversized dt.
      }
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
      { timeout: timing.settle },
    ).toBe(true)
    const samples = await page.evaluate(() => {
      const runtime = window as unknown as {
        __phase5FitSampling?: boolean
        __phase5FitSamples?: Array<{
          t: number; x: number; y: number; z: number; settled: boolean
        }>
      }
      runtime.__phase5FitSampling = false
      return runtime.__phase5FitSamples ?? []
    })
    expect(samples.length).toBeGreaterThan(5)
    expect(samples.some((sample) => !sample.settled)).toBe(true)
    let maxStep = 0
    let maxSpeed = 0
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1]!
      const current = samples[index]!
      const distance = Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
        current.z - previous.z,
      )
      const dtS = (current.t - previous.t) / 1000
      maxStep = Math.max(maxStep, distance)
      if (dtS > 0 && dtS <= 0.1) maxSpeed = Math.max(maxSpeed, distance / dtS)
    }
    const firstSample = samples[0]!
    const lastSample = samples[samples.length - 1]!
    expect(Math.hypot(
      lastSample.x - firstSample.x,
      lastSample.y - firstSample.y,
      lastSample.z - firstSample.z,
    )).toBeLessThanOrEqual(3)
    expect(maxStep).toBeLessThanOrEqual(0.5)
    expect(maxSpeed).toBeLessThanOrEqual(12)

    // CockpitApp deliberately reasserts authored tweak defaults for its first
    // 180 frames after mount. Wait past that startup guard before exercising
    // the same live setter as an independent transform invalidation.
    await observeFrames(page, 190)
    const beforeTransform = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()!.solveCount,
    )
    await page.evaluate(() => {
      const deck = (window as unknown as {
        __cockpitTurntable: { setTransform(values: { s: number }): void }
      }).__cockpitTurntable
      deck.setTransform({ s: 50 })
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.status),
      { timeout: timing.transition },
    ).toBe('degraded')
    const degraded = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit())
    expect(degraded!.reason).toBe('unfittable-at-max')
    expect(degraded!.solveCount).toBe(beforeTransform + 1)
    await expect(page.locator('[data-hud="browse-hint"]')).toHaveCount(0)
    await observeFrames(page, 30)
    expect(warnings).toHaveLength(1)

    await page.evaluate(() => {
      const deck = (window as unknown as {
        __cockpitTurntable: { setTransform(values: { s: number }): void }
      }).__cockpitTurntable
      deck.setTransform({ s: 1.75 })
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.status),
      { timeout: timing.transition },
    ).toBe('fit')
    await expect(page.locator('[data-hud="browse-hint"]')).toBeVisible()
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
      { timeout: timing.settle },
    ).toBe(true)

    // Success closes the warning episode. A later independent failure warns
    // once again, and still deduplicates across idle frames.
    await page.evaluate(() => {
      const deck = (window as unknown as {
        __cockpitTurntable: { setTransform(values: { s: number }): void }
      }).__cockpitTurntable
      deck.setTransform({ s: 50 })
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.status),
      { timeout: timing.transition },
    ).toBe('degraded')
    await observeFrames(page, 20)
    expect(warnings).toHaveLength(2)
    await page.evaluate(() => {
      const deck = (window as unknown as {
        __cockpitTurntable: { setTransform(values: { s: number }): void }
      }).__cockpitTurntable
      deck.setTransform({ s: 1.75 })
    })
    await expect.poll(
      () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.status),
      { timeout: timing.transition },
    ).toBe('fit')
    await expect(page.locator('[data-hud="browse-hint"]')).toBeVisible()

    // The refit path is additive: existing focused-mode switches retain
    // their authored 0.85 s and crate→deck 0.38 s blends and settle gating.
    await enterView(page, 'monitor')
    expectModeSwitchUnchanged(await sampleModeSwitch(page, 'crate'), 0.85)
    expectModeSwitchUnchanged(await sampleModeSwitch(page, 'deck'), 0.38)
  })
})
