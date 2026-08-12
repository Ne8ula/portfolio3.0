import { expect, test, type Page } from '@playwright/test'

import {
  MAX_WHEEL_STEP_PX,
  MAX_PITCH_RAD,
  MAX_YAW_RAD,
  PARALLAX_PITCH_SCALE,
  PARALLAX_YAW_SCALE,
  responseExponentFor,
  sizeRatioFor,
} from '../lib/responsive/input-policy'
import { ciTimeout, resolveE2eTiming } from '../scripts/e2e-policy'

const timing = resolveE2eTiming()

type FreeLookSnapshot = {
  yawTarget: number
  pitchTarget: number
  exponent: number
  boxW: number
  boxH: number
}

type VisibleBox = {
  x: number
  y: number
  width: number
  height: number
}

type ActivationPoint = { x: number; y: number }

type WheelTraceInit = {
  readonly deltaMode?: number
  readonly deltaX?: number
  readonly deltaY?: number
  readonly shiftKey?: boolean
  readonly ctrlKey?: boolean
  readonly metaKey?: boolean
  readonly altKey?: boolean
}

type PanSnapshot = {
  mode: 'fit' | 'contained'
  x: number
  y: number
  maxX: number
  maxY: number
  sizeRatio: number
  inertiaActive: boolean
  reducedMotion: boolean
}

type PointerActivationSnapshot = {
  pendingCount: number
  pendingActivation: {
    owner: 'crate' | 'deck' | 'coffee' | 'decorations' | 'pc'
    key: string
  } | null
  activationCount: number
  lastActivation: {
    owner: 'crate' | 'deck' | 'coffee' | 'decorations' | 'pc'
    key: string
    count: number
  } | null
}

const HOVER_CASES = [
  { width: 1440, height: 900 },
  { width: 1024, height: 600 },
  { width: 512, height: 300 },
] as const

const PAN_CASES = [
  { width: 800, height: 450 },
  { width: 683, height: 325 },
  { width: 512, height: 300 },
  { width: 320, height: 568 },
] as const

async function enterCockpit(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem('cockpit-intro-complete-v1')
    window.localStorage.removeItem('cockpit-a11y-v1')
  })
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: timing.transition,
  })
  await page.evaluate((timeoutMs) => {
    const hooks = window.__COCKPIT_TEST_HOOKS__!
    hooks.configureSettleTimeout(timeoutMs)
    hooks.skipIntro()
  }, timing.settle)
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Playwright viewport is unavailable')
  await expect(page.locator('.responsive-stage')).toHaveAttribute(
    'data-stage-mode',
    viewport.width < 1024 || viewport.height < 600 ? 'contained' : 'fit',
  )
  await expect.poll(
    () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status),
    { timeout: timing.transition },
  ).toBe('ready')
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: timing.transition },
  )
}

async function visibleHoverBox(page: Page): Promise<VisibleBox> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('[data-layout-region="cockpit-stage"]')
    if (!stage) throw new Error('cockpit stage is not mounted')
    const container = stage.closest<HTMLElement>('.responsive-stage')
    const visible = container?.dataset.stageMode === 'contained' ? container : stage
    const rect = visible.getBoundingClientRect()
    return visible === stage
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : {
          x: rect.x + visible.clientLeft,
          y: rect.y + visible.clientTop,
          width: visible.clientWidth,
          height: visible.clientHeight,
        }
  })
}

async function freeLook(page: Page): Promise<FreeLookSnapshot> {
  return page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFreeLookState())
}

async function panState(page: Page): Promise<PanSnapshot> {
  return page.evaluate(() => {
    const state = window.__COCKPIT_TEST_HOOKS__!.getPanState()
    if (!state) throw new Error('contained-pan state is not ready')
    return state
  })
}

async function dispatchWheel(
  page: Page,
  init: WheelTraceInit,
): Promise<{ defaultPrevented: boolean; state: PanSnapshot }> {
  return page.locator('.responsive-stage').evaluate((element, wheelInit) => {
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ...wheelInit,
    })
    element.dispatchEvent(event)
    const state = window.__COCKPIT_TEST_HOOKS__!.getPanState()
    if (!state) throw new Error('contained-pan state is not ready')
    return { defaultPrevented: event.defaultPrevented, state }
  }, init)
}

async function windowScrollState(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY)
}

async function expectSmoothed(
  page: Page,
  expectedYaw: number,
  expectedPitch: number,
  yawTolerance: number,
  pitchTolerance: number,
): Promise<void> {
  await expect.poll(
    () => page.evaluate(
      ({ yaw, pitch, yawTol, pitchTol }) => {
        const runtime = window as unknown as {
          __cockpitSmoothedYaw?: number | null
          __cockpitSmoothedPitch?: number | null
        }
        return (
          Math.abs((runtime.__cockpitSmoothedYaw ?? 0) - yaw) <= yawTol &&
          Math.abs((runtime.__cockpitSmoothedPitch ?? 0) - pitch) <= pitchTol
        )
      },
      {
        yaw: expectedYaw,
        pitch: expectedPitch,
        yawTol: yawTolerance,
        pitchTol: pitchTolerance,
      },
    ),
    { timeout: timing.transition },
  ).toBe(true)
}

async function moveToNormalizedPoint(
  page: Page,
  box: VisibleBox,
  normalizedX: number,
  normalizedY: number,
): Promise<void> {
  // A half-pixel inset keeps CDP coordinates inside the viewport while still
  // reaching >99% of the authored envelope at the visible-box edge.
  const insetX = normalizedX === 0 ? 0 : -Math.sign(normalizedX) * 0.5
  const insetY = normalizedY === 0 ? 0 : -Math.sign(normalizedY) * 0.5
  await page.mouse.move(
    box.x + box.width / 2 + normalizedX * box.width / 2 + insetX,
    box.y + box.height / 2 + normalizedY * box.height / 2 + insetY,
  )
}

async function pointerActivationState(page: Page): Promise<PointerActivationSnapshot> {
  return page.evaluate(
    () => window.__COCKPIT_TEST_HOOKS__!.getPointerActivationState(),
  )
}

async function findActivationPoint(
  page: Page,
  key: string,
): Promise<ActivationPoint | null> {
  const scrollFractions = [0.5, 0, 1] as const
  for (const yFraction of scrollFractions) {
    for (const xFraction of scrollFractions) {
      await page.evaluate(({ x, y }) => {
        const region = document.querySelector<HTMLElement>('.responsive-stage')
        if (!region) throw new Error('responsive stage is not mounted')
        region.scrollTo({
          left: (region.scrollWidth - region.clientWidth) * x,
          top: (region.scrollHeight - region.clientHeight) * y,
          behavior: 'instant',
        })
      }, { x: xFraction, y: yFraction })
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))

      const point = await page.evaluate(({ targetKey }) => {
        const hooks = window.__COCKPIT_TEST_HOOKS__!
        const canvas = document.querySelector<HTMLCanvasElement>(
          '[data-layout-region="cockpit-stage"] canvas',
        )
        const region = document.querySelector<HTMLElement>('.responsive-stage')
        if (!canvas || !region) return null
        const canvasRect = canvas.getBoundingClientRect()
        const regionRect = region.getBoundingClientRect()
        const left = Math.ceil(Math.max(
          canvasRect.left,
          regionRect.left + region.clientLeft,
          12,
        ))
        const top = Math.ceil(Math.max(
          canvasRect.top,
          regionRect.top + region.clientTop,
          12,
        ))
        const right = Math.floor(Math.min(
          canvasRect.right,
          regionRect.left + region.clientLeft + region.clientWidth,
          window.innerWidth - 12,
        ))
        const bottom = Math.floor(Math.min(
          canvasRect.bottom,
          regionRect.top + region.clientTop + region.clientHeight,
          window.innerHeight - 12,
        ))
        const isCandidate = (x: number, y: number) => {
          if (x < left || x >= right || y < top || y >= bottom) return false
          const eventTarget = document.elementFromPoint(x, y)
          const reachesArbiter = eventTarget === canvas || (
            eventTarget instanceof Element &&
            eventTarget.closest('[data-pointer-activation-proxy]') !== null
          )
          return reachesArbiter &&
            hooks.getPointerActivationCandidate({ x, y })?.key === targetKey
        }
        const projected = hooks.getPointerActivationPoint(targetKey)
        if (projected) {
          const localRadius = targetKey === 'tablet' || targetKey === 'shaker' ? 180 : 48
          const localStep = targetKey === 'tablet' || targetKey === 'shaker' ? 6 : 3
          const localMatches: Array<{ x: number; y: number }> = []
          for (
            let y = projected.y - localRadius;
            y <= projected.y + localRadius;
            y += localStep
          ) {
            for (
              let x = projected.x - localRadius;
              x <= projected.x + localRadius;
              x += localStep
            ) {
              if (isCandidate(x, y)) localMatches.push({ x, y })
            }
          }
          if (localMatches.length > 0) {
            const center = localMatches.reduce(
              (sum, match) => ({ x: sum.x + match.x, y: sum.y + match.y }),
              { x: 0, y: 0 },
            )
            center.x /= localMatches.length
            center.y /= localMatches.length
            return localMatches.reduce((best, match) => (
              Math.hypot(match.x - center.x, match.y - center.y) <
              Math.hypot(best.x - center.x, best.y - center.y)
                ? match
                : best
            ))
          }
        }
        const steps = [12, 6]
        for (const step of steps) {
          for (let y = top + step / 2; y < bottom; y += step) {
            for (let x = left + step / 2; x < right; x += step) {
              if (isCandidate(x, y)) return { x, y }
            }
          }
        }
        return null
      }, { targetKey: key })
      if (point) return point
    }
  }
  return null
}

async function discoverActivationPoint(
  page: Page,
  key: string,
): Promise<ActivationPoint> {
  const box = await visibleHoverBox(page)
  // Start neutral, then sweep the authored free-look envelope. Peripheral
  // desk targets can sit outside the neutral camera frame while still being
  // visitor-reachable through ordinary pointer movement.
  const lookHints: ReadonlyArray<readonly [number, number]> = key.startsWith('coffee-')
    ? [[0, 0], [-0.95, 0], [-0.95, -0.8], [-0.95, 0.8]]
    : key === 'tablet' || key === 'shaker'
      ? [[0, 0], [0.95, 0], [0.95, 0.8], [0.95, -0.8]]
      : [[0, 0], [-0.95, 0], [0.95, 0]]
  for (const [nx, ny] of lookHints) {
    await page.mouse.move(
      box.x + box.width / 2 + nx * (box.width / 2 - 1),
      box.y + box.height / 2 + ny * (box.height / 2 - 1),
    )
    const target = await freeLook(page)
    await expectSmoothed(
      page,
      target.yawTarget,
      target.pitchTarget,
      PARALLAX_YAW_SCALE * 0.005,
      PARALLAX_PITCH_SCALE * 0.005,
    )
    const discovered = await findActivationPoint(page, key)
    if (discovered) return discovered
  }
  throw new Error(`No reachable pointer-activation target found for ${key}`)
}

async function armActivationTarget(
  page: Page,
  key: string,
  activationCount: number,
): Promise<ActivationPoint> {
  let point = await discoverActivationPoint(page, key)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    const state = await pointerActivationState(page)
    if (
      state.pendingCount === 1 &&
      state.pendingActivation?.key === key &&
      state.activationCount === activationCount
    ) return point

    // A target that moved between discovery and the trusted pointerdown must
    // never activate accidentally. Exceed slop for any wrong pending owner,
    // release it, then reacquire against the current camera frame.
    if (state.pendingCount > 0) {
      await page.mouse.move(point.x + 7, point.y)
      await page.mouse.move(point.x, point.y)
    }
    await page.mouse.up()
    expect(await pointerActivationState(page)).toMatchObject({
      pendingCount: 0,
      activationCount,
    })
    const next = await findActivationPoint(page, key)
    point = next ?? await discoverActivationPoint(page, key)
  }
  throw new Error(`Pointer-activation target could not be armed for ${key}`)
}

async function expectDragThenSubSlopClick(
  page: Page,
  key: string,
): Promise<void> {
  const before = await pointerActivationState(page)
  const point = await armActivationTarget(page, key, before.activationCount)

  // Returning to the down position before release proves that slop is the
  // maximum Euclidean displacement, not release distance or path length.
  await page.mouse.move(point.x + 7, point.y)
  await page.mouse.move(point.x, point.y)
  await page.mouse.up()
  await expect.poll(
    () => pointerActivationState(page),
    { timeout: timing.expect },
  ).toMatchObject({
    pendingCount: 0,
    activationCount: before.activationCount,
  })

  // The cancelled drag also drives free-look, so the projected artifact may
  // have moved beneath the pointer before the independent click trace starts.
  // Re-resolve its live hit point instead of reusing a stale screen coordinate.
  const clickPoint = await armActivationTarget(page, key, before.activationCount)

  // This loop travels well over 6 px in aggregate while never leaving a
  // 4×4 square (maximum displacement sqrt(32) < 6), so it must click.
  await expect.poll(
    () => pointerActivationState(page),
    { timeout: timing.expect },
  ).toMatchObject({
    pendingCount: 1,
    pendingActivation: { key },
    activationCount: before.activationCount,
  })
  await page.mouse.move(clickPoint.x + 4, clickPoint.y)
  await page.mouse.move(clickPoint.x + 4, clickPoint.y + 4)
  await page.mouse.move(clickPoint.x, clickPoint.y + 4)
  await page.mouse.move(clickPoint.x, clickPoint.y)
  await expect.poll(
    () => pointerActivationState(page),
    { timeout: timing.expect },
  ).toMatchObject({
    pendingCount: 1,
    pendingActivation: { key },
    activationCount: before.activationCount,
  })
  await page.mouse.up()
  await expect.poll(
    () => pointerActivationState(page),
    { timeout: timing.expect },
  ).toMatchObject({
    pendingCount: 0,
    activationCount: before.activationCount + 1,
    lastActivation: { key, count: before.activationCount + 1 },
  })
}

test.describe('Phase 5 free-look input normalization', () => {
  test('AC-9/13 reaches the bounded full envelope from every visible-box edge and corner', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))

    const points = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
    ] as const

    for (const viewport of HOVER_CASES) {
      await page.setViewportSize(viewport)
      await enterCockpit(page)
      const box = await visibleHoverBox(page)

      for (const point of points) {
        await moveToNormalizedPoint(page, box, point.x, point.y)
        const state = await freeLook(page)
        const expectedYaw = point.x === 0 ? 0 : -point.x * MAX_YAW_RAD
        const expectedPitch = point.y === 0 ? 0 : -point.y * MAX_PITCH_RAD

        expect(state.boxW).toBeCloseTo(box.width, 1)
        expect(state.boxH).toBeCloseTo(box.height, 1)
        expect(state.exponent).toBeCloseTo(responseExponentFor({
          w: box.width,
          h: box.height,
        }), 10)
        expect(Math.abs(state.yawTarget)).toBeLessThanOrEqual(MAX_YAW_RAD + 1e-12)
        expect(Math.abs(state.pitchTarget)).toBeLessThanOrEqual(MAX_PITCH_RAD + 1e-12)
        expect(Math.abs(state.yawTarget - expectedYaw)).toBeLessThanOrEqual(
          point.x === 0 ? 1e-6 : MAX_YAW_RAD * 0.01,
        )
        expect(Math.abs(state.pitchTarget - expectedPitch)).toBeLessThanOrEqual(
          point.y === 0 ? 1e-6 : MAX_PITCH_RAD * 0.01,
        )
        await expectSmoothed(
          page,
          expectedYaw,
          expectedPitch,
          MAX_YAW_RAD * 0.01,
          MAX_PITCH_RAD * 0.01,
        )
      }

      if (viewport.width === 512) {
        const stageWidth = await page.locator('[data-layout-region="cockpit-stage"]')
          .evaluate((stage) => stage.getBoundingClientRect().width)
        expect(stageWidth).toBeGreaterThan(box.width)
        expect(box.width).toBeGreaterThan(480)
        expect(box.width).toBeLessThanOrEqual(512)
      }
    }
  })

  test('AC-10 applies near-center damping and pointer exit decays to center', async ({ page }) => {
    test.setTimeout(ciTimeout(180_000, 720_000))
    const observed: number[] = []

    for (const viewport of HOVER_CASES) {
      await page.setViewportSize(viewport)
      await enterCockpit(page)
      const box = await visibleHoverBox(page)
      await moveToNormalizedPoint(page, box, 0.25, 0)
      const state = await freeLook(page)
      const expected = Math.pow(0.25, state.exponent) * MAX_YAW_RAD

      expect(Math.abs(Math.abs(state.yawTarget) - expected)).toBeLessThanOrEqual(expected * 0.05)
      await expectSmoothed(page, -expected, 0, expected * 0.05, MAX_PITCH_RAD * 0.01)
      observed.push(Math.abs(state.yawTarget))
    }

    expect(observed[1]!).toBeLessThan(observed[0]!)
    expect(observed[2]!).toBeLessThan(observed[1]!)

    await page.mouse.move(-10, -10)
    await expect.poll(() => freeLook(page), { timeout: timing.expect }).toMatchObject({
      yawTarget: 0,
      pitchTarget: 0,
    })
    await expectSmoothed(page, 0, 0, MAX_YAW_RAD * 0.01, MAX_PITCH_RAD * 0.01)
  })

  test('AC-18 resolves system and explicit motion precedence for hover and focused parallax', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(180_000, 720_000))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterCockpit(page)
    const box = await visibleHoverBox(page)

    // System reduce with no explicit override.
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'reduced')
    await moveToNormalizedPoint(page, box, 1, 1)
    await expect.poll(() => freeLook(page), { timeout: timing.expect }).toMatchObject({
      yawTarget: 0,
      pitchTarget: 0,
    })
    await expectSmoothed(page, 0, 0, 1e-9, 1e-9)

    // Explicit Reduced with system no-preference, applied through the live
    // ACCESSIBILITY dialog; focused parallax remains disabled too.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'full')
    await page.locator('[data-hud="accessibility-trigger"]').click()
    const dialog = page.locator('[data-hud="accessibility-dialog"]')
    await dialog.locator('label[for="a11y-motion-reduced"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'reduced')
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    await moveToNormalizedPoint(page, box, -1, -1)
    await expect.poll(() => freeLook(page), { timeout: timing.expect }).toMatchObject({
      yawTarget: 0,
      pitchTarget: 0,
    })
    await expectSmoothed(page, 0, 0, 1e-9, 1e-9)

    // Explicit Full wins over system reduce and resumes on the next real
    // pointer event without a reload.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await dialog.locator('label[for="a11y-motion-full"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'full')
    await moveToNormalizedPoint(page, box, 1, 1)
    const resumed = await freeLook(page)
    expect(Math.abs(resumed.yawTarget + PARALLAX_YAW_SCALE)).toBeLessThanOrEqual(
      PARALLAX_YAW_SCALE * 0.01,
    )
    expect(Math.abs(resumed.pitchTarget + PARALLAX_PITCH_SCALE)).toBeLessThanOrEqual(
      PARALLAX_PITCH_SCALE * 0.01,
    )
    await expectSmoothed(
      page,
      -PARALLAX_YAW_SCALE,
      -PARALLAX_PITCH_SCALE,
      PARALLAX_YAW_SCALE * 0.02,
      PARALLAX_PITCH_SCALE * 0.02,
    )
  })
})

test.describe('Phase 5 contained pan', () => {
  test('AC-11/12/14/15 applies gain only to normalized accumulated input and reaches every bound', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))

    for (const viewport of PAN_CASES) {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await enterCockpit(page)

      const initial = await panState(page)
      const expectedRatio = sizeRatioFor({ w: viewport.width, h: viewport.height })
      expect(initial).toMatchObject({
        mode: 'contained',
        inertiaActive: false,
        reducedMotion: true,
      })
      expect(initial.sizeRatio).toBeCloseTo(expectedRatio, 10)
      expect(initial.x).toBeCloseTo(initial.maxX / 2, 1)
      expect(initial.y).toBeCloseTo(initial.maxY / 2, 1)

      const wheel = await dispatchWheel(page, { deltaY: 20, deltaMode: 0 })
      expect(wheel.defaultPrevented).toBe(true)
      expect(wheel.state.y - initial.y).toBeCloseTo(20 * expectedRatio, 5)

      await page.locator('[data-hud="pan-reset"]').click()
      const lineHeight = await page.locator('.responsive-stage').evaluate((element) => {
        const parsed = Number.parseFloat(getComputedStyle(element).lineHeight)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 16
      })
      const pageSize = await page.locator('.responsive-stage').evaluate(
        (element) => element.clientHeight,
      )
      const equivalentDeltas = [
        { deltaY: 20, deltaMode: 0 },
        { deltaY: 20 / lineHeight, deltaMode: 1 },
        { deltaY: 20 / pageSize, deltaMode: 2 },
      ] as const
      const modeDisplacements: number[] = []
      for (const init of equivalentDeltas) {
        await page.locator('[data-hud="pan-reset"]').click()
        const before = await panState(page)
        const result = await dispatchWheel(page, {
          deltaY: init.deltaY,
          deltaMode: init.deltaMode,
        })
        modeDisplacements.push(result.state.y - before.y)
      }
      for (const displacement of modeDisplacements) {
        expect(displacement).toBeCloseTo(20 * expectedRatio, 4)
      }

      await page.locator('[data-hud="pan-reset"]').click()
      const beforeSpike = await panState(page)
      const spike = await dispatchWheel(page, { deltaY: 5000, deltaMode: 0 })
      expect(spike.state.y - beforeSpike.y).toBeLessThanOrEqual(
        MAX_WHEEL_STEP_PX * expectedRatio + 0.01,
      )
      await page.locator('[data-hud="pan-reset"]').click()
      const beforeFine = await panState(page)
      const fine = await dispatchWheel(page, { deltaY: 2, deltaMode: 0 })
      expect(fine.state.y - beforeFine.y).toBeCloseTo(2 * expectedRatio, 5)

      for (let index = 0; index < 10; index += 1) {
        await dispatchWheel(page, { shiftKey: true, deltaY: 5000, deltaMode: 0 })
        await dispatchWheel(page, { deltaY: 5000, deltaMode: 0 })
      }
      const atMaximum = await panState(page)
      expect(atMaximum.x).toBeCloseTo(atMaximum.maxX, 1)
      expect(atMaximum.y).toBeCloseTo(atMaximum.maxY, 1)

      for (let index = 0; index < 10; index += 1) {
        await dispatchWheel(page, { shiftKey: true, deltaY: -5000, deltaMode: 0 })
        await dispatchWheel(page, { deltaY: -5000, deltaMode: 0 })
      }
      const atMinimum = await panState(page)
      expect(atMinimum.x).toBeCloseTo(0, 1)
      expect(atMinimum.y).toBeCloseTo(0, 1)
    }
  })

  test('AC-12/16 pointer, keyboard, native-scroll resync, Home, and RESET paths operate', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(180_000, 720_000))
    const dragDisplacements: number[] = []

    for (const viewport of [PAN_CASES[0], PAN_CASES[2]]) {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await enterCockpit(page)
      const region = page.locator('.responsive-stage')
      const box = await region.boundingBox()
      if (!box) throw new Error('responsive stage has no box')

      const beforeDrag = await panState(page)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2)
      const duringDrag = await panState(page)
      await page.mouse.up()
      dragDisplacements.push(duringDrag.x - beforeDrag.x)
      expect(duringDrag.x - beforeDrag.x).toBeCloseTo(
        100 * sizeRatioFor({ w: viewport.width, h: viewport.height }),
        2,
      )
      expect((await panState(page)).inertiaActive).toBe(false)

      await region.focus()
      const beforeKeys = await panState(page)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('d')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('s')
      await page.keyboard.press('PageDown')
      const afterKeys = await panState(page)
      expect(afterKeys.x).toBeGreaterThan(beforeKeys.x)
      expect(afterKeys.y).toBeGreaterThan(beforeKeys.y)

      await page.keyboard.press('Home')
      const homed = await panState(page)
      expect(homed.x).toBeCloseTo(homed.maxX / 2, 1)
      expect(homed.y).toBeCloseTo(homed.maxY / 2, 1)

      await region.evaluate((element) => {
        element.scrollLeft = 17
        element.scrollTop = 11
      })
      await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
        x: 17,
        y: 11,
      })

      await page.locator('[data-hud="pan-reset"]').click()
      const reset = await panState(page)
      expect(reset.x).toBeCloseTo(reset.maxX / 2, 1)
      expect(reset.y).toBeCloseTo(reset.maxY / 2, 1)
    }

    expect(dragDisplacements[0]! / dragDisplacements[1]!).toBeCloseTo(0.5 / 0.45, 1)
  })

  test('AC-18/19 honors live motion precedence, drag-only inertia, modifier bypass, and scroll freedom', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(180_000, 720_000))
    await page.setViewportSize({ width: 512, height: 300 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterCockpit(page)
    const region = page.locator('.responsive-stage')
    const box = await region.boundingBox()
    if (!box) throw new Error('responsive stage has no box')

    expect((await panState(page)).reducedMotion).toBe(true)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2)
    await page.mouse.up()
    expect((await panState(page)).inertiaActive).toBe(false)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      reducedMotion: false,
    })
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(40)
    await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2)
    await page.waitForTimeout(40)
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2)
    await page.waitForTimeout(40)
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2)
    await page.mouse.up()
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      inertiaActive: true,
    })

    await page.locator('[data-hud="accessibility-trigger"]').click()
    const dialog = page.locator('[data-hud="accessibility-dialog"]')
    await dialog.locator('label[for="a11y-motion-reduced"]').click()
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      reducedMotion: true,
      inertiaActive: false,
    })
    await dialog.locator('label[for="a11y-motion-full"]').click()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      reducedMotion: false,
    })
    await dialog.getByRole('button', { name: /^close$/i }).click()

    await page.locator('[data-hud="pan-reset"]').click()
    const beforeModifiers = await panState(page)
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      const result = await dispatchWheel(page, { [modifier]: true, deltaY: 100 })
      expect(result.defaultPrevented).toBe(false)
      expect(result.state.x).toBeCloseTo(beforeModifiers.x, 5)
      expect(result.state.y).toBeCloseTo(beforeModifiers.y, 5)
    }
    const shifted = await dispatchWheel(page, { shiftKey: true, deltaY: 40 })
    expect(shifted.defaultPrevented).toBe(true)
    expect(shifted.state.x).toBeGreaterThan(beforeModifiers.x)

    await region.focus()
    const escapePrevented = await region.evaluate((element) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      element.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(escapePrevented).toBe(false)
    await page.keyboard.press('Tab')
    await expect(region).not.toBeFocused()
    await expect(page.locator('[data-hud="site-header"] a[href="/projects"]')).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, 0))
    const outside = page.locator('[data-hud="accessibility-trigger"]')
    const outsideBox = await outside.boundingBox()
    if (!outsideBox) throw new Error('accessibility trigger has no box')
    await page.mouse.move(
      outsideBox.x + outsideBox.width / 2,
      outsideBox.y + outsideBox.height / 2,
    )
    await page.mouse.wheel(0, 300)
    await expect.poll(() => windowScrollState(page), { timeout: timing.expect }).toBeGreaterThan(0)

    for (let index = 0; index < 10; index += 1) {
      await dispatchWheel(page, { deltaY: 5000 })
    }
    const beforeChain = await windowScrollState(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 600)
    await expect.poll(() => windowScrollState(page), { timeout: timing.expect }).toBeGreaterThan(
      beforeChain,
    )
  })

  test('AC-21/29 renders stable contained chrome across themes, accessibility states, and tier transitions', async ({
    page,
  }) => {
    test.setTimeout(ciTimeout(180_000, 720_000))
    await page.setViewportSize({ width: 1440, height: 900 })
    await enterCockpit(page)
    expect(await panState(page)).toMatchObject({ mode: 'fit', inertiaActive: false })
    expect((await dispatchWheel(page, { deltaY: 100 })).defaultPrevented).toBe(false)

    const identityBefore = await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>('.responsive-stage')!
      const surface = region.querySelector<HTMLElement>('.responsive-stage-surface')!
      const canvas = surface.querySelector<HTMLCanvasElement>('canvas')!
      ;(region as HTMLElement & { __phase5Identity?: string }).__phase5Identity = 'region'
      ;(surface as HTMLElement & { __phase5Identity?: string }).__phase5Identity = 'surface'
      ;(canvas as HTMLCanvasElement & { __phase5Identity?: string }).__phase5Identity = 'canvas'
      const runtime = window as unknown as { __phase5ContextEvents?: number }
      runtime.__phase5ContextEvents = 0
      for (const name of ['webglcontextlost', 'webglcontextrestored']) {
        canvas.addEventListener(name, () => { runtime.__phase5ContextEvents! += 1 })
      }
      return window.__COCKPIT_TEST_HOOKS__!.getRendererState().rebuildCount
    })

    await page.setViewportSize({ width: 320, height: 568 })
    const region = page.locator('.responsive-stage')
    await expect(region).toHaveAttribute('data-stage-mode', 'contained')
    const bar = page.locator('[data-hud="pan-instructions"]')
    const reset = page.locator('[data-hud="pan-reset"]')
    await expect(bar).toContainText('DRAG · ARROWS/WASD · HOME CENTERS')
    await expect(reset).toHaveText('RESET')
    await expect(reset).toHaveAttribute('aria-label', 'Reset pan to center')
    await expect(bar.locator('.pan-instructions-caption')).toHaveAttribute(
      'aria-hidden',
      'false',
    )
    const describedBy = await region.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toContainText(
      'DRAG · ARROWS/WASD · HOME CENTERS',
    )
    await region.focus()
    expect(await region.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      'none',
    )

    const darkChrome = await bar.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
    }))
    await page.locator('[data-hud="theme-toggle"]').click()
    const lightChrome = await bar.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
    }))
    expect(lightChrome).not.toEqual(darkChrome)

    const standardCaptionSize = await bar.locator('.pan-instructions-caption').evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).fontSize),
    )
    for (const attributes of [
      { 'data-a11y-motion': 'reduced' },
      { 'data-a11y-contrast': 'high' },
      { 'data-a11y-transparency': 'reduced' },
      { 'data-a11y-text': 'large' },
      { 'data-a11y-controls': 'large' },
      { 'data-a11y-text': 'large', 'data-a11y-controls': 'large' },
    ]) {
      await page.locator('html').evaluate((root, values) => {
        for (const [name, value] of Object.entries(values)) root.setAttribute(name, value)
      }, attributes)
      const boxes = await page.evaluate(() => {
        const wrapper = document.querySelector<HTMLElement>('.responsive-stage-frame')!
        const chrome = document.querySelector<HTMLElement>('[data-hud="pan-instructions"]')!
        const button = document.querySelector<HTMLElement>('[data-hud="pan-reset"]')!
        const wrapperRect = wrapper.getBoundingClientRect()
        const chromeRect = chrome.getBoundingClientRect()
        const buttonRect = button.getBoundingClientRect()
        return { wrapperRect, chromeRect, buttonRect }
      })
      expect(boxes.chromeRect.left).toBeGreaterThanOrEqual(boxes.wrapperRect.left + 11)
      expect(boxes.chromeRect.right).toBeLessThanOrEqual(boxes.wrapperRect.right - 11)
      const expectedControlSize =
        attributes['data-a11y-controls'] === 'large' ? 56 : 44
      await expect.poll(
        () => reset.evaluate((element) => element.getBoundingClientRect().width),
        { timeout: timing.expect },
      ).toBeGreaterThanOrEqual(expectedControlSize)
      await expect.poll(
        () => reset.evaluate((element) => element.getBoundingClientRect().height),
        { timeout: timing.expect },
      ).toBeGreaterThanOrEqual(expectedControlSize)
    }
    const largeCaptionSize = await bar.locator('.pan-instructions-caption').evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).fontSize),
    )
    expect(largeCaptionSize).toBeGreaterThan(standardCaptionSize)
    const captionFlow = await bar.locator('.pan-instructions-caption').evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
      }
    })
    expect(captionFlow.height).toBeGreaterThan(captionFlow.lineHeight * 1.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(reset).toBeVisible()
    expect(await bar.evaluate((element) => getComputedStyle(element).borderStyle)).not.toBe('none')
    await page.emulateMedia({ forcedColors: 'none' })

    await region.evaluate((element) => {
      element.scrollLeft = 17
      element.scrollTop = 11
    })
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      x: 17,
      y: 11,
    })
    await page.setViewportSize({ width: 800, height: 450 })
    await expect.poll(() => panState(page), { timeout: timing.expect }).toMatchObject({
      x: 17,
      y: 11,
    })

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(bar).toHaveCount(0)
    expect(await page.evaluate(() => {
      const regionElement = document.querySelector<HTMLElement>('.responsive-stage') as HTMLElement & { __phase5Identity?: string }
      const surface = regionElement.querySelector<HTMLElement>('.responsive-stage-surface') as HTMLElement & { __phase5Identity?: string }
      const canvas = surface.querySelector<HTMLCanvasElement>('canvas') as HTMLCanvasElement & { __phase5Identity?: string }
      const runtime = window as unknown as { __phase5ContextEvents?: number }
      return {
        region: regionElement.__phase5Identity,
        surface: surface.__phase5Identity,
        canvas: canvas.__phase5Identity,
        rebuildCount: window.__COCKPIT_TEST_HOOKS__!.getRendererState().rebuildCount,
        contextEvents: runtime.__phase5ContextEvents,
      }
    })).toEqual({
      region: 'region',
      surface: 'surface',
      canvas: 'canvas',
      rebuildCount: identityBefore,
      contextEvents: 0,
    })

    await page.setViewportSize({ width: 800, height: 450 })
    await expect(region).toHaveAttribute('data-stage-mode', 'contained')
    const reentered = await panState(page)
    expect(reentered.x).toBeCloseTo(reentered.maxX / 2, 1)
    expect(reentered.y).toBeCloseTo(reentered.maxY / 2, 1)
    expect(await page.evaluate(() => {
      const regionElement = document.querySelector<HTMLElement>('.responsive-stage') as HTMLElement & { __phase5Identity?: string }
      const surface = regionElement.querySelector<HTMLElement>('.responsive-stage-surface') as HTMLElement & { __phase5Identity?: string }
      const canvas = surface.querySelector<HTMLCanvasElement>('canvas') as HTMLCanvasElement & { __phase5Identity?: string }
      return [regionElement.__phase5Identity, surface.__phase5Identity, canvas.__phase5Identity]
    })).toEqual(['region', 'surface', 'canvas'])

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/responsive-preview')
    const previewRegion = page.locator('.responsive-stage')
    await expect(previewRegion).toHaveAttribute('data-stage-mode', 'fit')
    await previewRegion.evaluate((element) => {
      const surface = element.querySelector<HTMLElement>('.responsive-stage-surface')!
      ;(element as HTMLElement & { __phase5Identity?: string }).__phase5Identity = 'region'
      ;(surface as HTMLElement & { __phase5Identity?: string }).__phase5Identity = 'surface'
    })
    await page.setViewportSize({ width: 800, height: 450 })
    await expect(previewRegion).toHaveAttribute('data-stage-mode', 'contained')
    expect(await previewRegion.evaluate((element) => ({
      region: (element as HTMLElement & { __phase5Identity?: string }).__phase5Identity,
      surface: (element.querySelector('.responsive-stage-surface') as HTMLElement & { __phase5Identity?: string }).__phase5Identity,
    }))).toEqual({ region: 'region', surface: 'surface' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(previewRegion).toHaveAttribute('data-stage-mode', 'fit')
    expect(await previewRegion.evaluate((element) => ({
      region: (element as HTMLElement & { __phase5Identity?: string }).__phase5Identity,
      surface: (element.querySelector('.responsive-stage-surface') as HTMLElement & { __phase5Identity?: string }).__phase5Identity,
    }))).toEqual({ region: 'region', surface: 'surface' })
  })
})

test.describe('Phase 5 gesture arbitration', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 800, height: 450 },
  ]) {
    test(`AC-17 arbitrates every artifact and click-away branch at ${viewport.width}×${viewport.height}`, async ({
      page,
    }) => {
      test.setTimeout(ciTimeout(300_000, 1_200_000))

      await page.setViewportSize(viewport)
      await enterCockpit(page)
      await page.evaluate(() => {
        const region = document.querySelector<HTMLElement>('.responsive-stage')!
        const runtime = window as unknown as {
          __phase5PointerDowns?: { count: number; defaultPrevented: number }
        }
        runtime.__phase5PointerDowns = { count: 0, defaultPrevented: 0 }
        region.addEventListener('pointerdown', (event) => {
          runtime.__phase5PointerDowns!.count += 1
          if (event.defaultPrevented) runtime.__phase5PointerDowns!.defaultPrevented += 1
        })
      })

      await expectDragThenSubSlopClick(page, 'pc')
      await expect.poll(
        () => page.evaluate(() => window.__cockpitViewMode),
        { timeout: timing.transition },
      ).toBe('monitor')
      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))

      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
      await expectDragThenSubSlopClick(page, 'crate-sleeve')
      await expect.poll(
        () => page.evaluate(() => window.__cockpitViewMode),
        { timeout: timing.transition },
      ).toBe('deck')
      await expect.poll(
        () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
        { timeout: timing.settle },
      ).toBe(true)

      let projectViewCount = 0
      await page.exposeFunction(`phase5ProjectView${viewport.width}`, () => {
        projectViewCount += 1
      })
      await page.evaluate((callbackName) => {
        document.querySelector('[data-hud="deck-project-link"]')
          ?.addEventListener('click', (event) => event.preventDefault())
        window.addEventListener('cockpit-project-view', () => {
          const callback = (window as unknown as Record<string, () => void>)[callbackName]
          callback?.()
        }, { once: true })
      }, `phase5ProjectView${viewport.width}`)
      await expectDragThenSubSlopClick(page, 'deck-view-more')
      await expect.poll(() => projectViewCount, { timeout: timing.expect }).toBe(1)

      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))
      const contained = viewport.width < 1024 || viewport.height < 600
      // The peripheral targets are authored outside the default 1440×900 fit
      // framing. Contained free-look reaches the dripper but not its resting
      // mug; a separate 1920×900 fit test covers the complete peripheral set.
      if (contained) {
        await expectDragThenSubSlopClick(page, 'coffee-dripper')
      }

      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('deck'))
      const deckModeBefore = await page.evaluate(() => window.__cockpitViewMode)
      expect(deckModeBefore).toBe('deck')
      await expectDragThenSubSlopClick(page, 'deck-click-away')
      await expect.poll(
        () => page.evaluate(() => window.__cockpitViewMode),
        { timeout: timing.transition },
      ).toBe('cockpit')

      await page.evaluate(async () => {
        await window.__COCKPIT_TEST_HOOKS__!.enterView('crate')
        window.__COCKPIT_TEST_HOOKS__!.selectRecord(1)
      })
      const previewBefore = await page.evaluate(
        () => window.__COCKPIT_TEST_HOOKS__!.getVinylMotion().sleeve.phase,
      )
      expect(previewBefore).toBe('preview')
      await expectDragThenSubSlopClick(page, 'crate-click-away')
      await expect.poll(
        () => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getVinylMotion().sleeve.phase),
        { timeout: timing.transition },
      ).toBe('idle')
      expect(await page.evaluate(() => window.__cockpitViewMode)).toBe('crate')

      await expectDragThenSubSlopClick(page, 'crate-click-away')
      await expect.poll(
        () => page.evaluate(() => window.__cockpitViewMode),
        { timeout: timing.transition },
      ).toBe('cockpit')

      const finalState = await pointerActivationState(page)
      // The fit row has PC/crate/deck plus the three exit presses; contained
      // adds the reachable coffee dripper. Each action has one
      // cancelled drag and one accepted click trace.
      const expectedActivations = contained ? 7 : 6
      expect(finalState.activationCount).toBe(expectedActivations)
      const pointerDowns = await page.evaluate(() => {
        const runtime = window as unknown as {
          __phase5PointerDowns?: { count: number; defaultPrevented: number }
        }
        return runtime.__phase5PointerDowns
      })
      expect(pointerDowns?.count).toBeGreaterThanOrEqual(expectedActivations * 2)
      expect(pointerDowns?.defaultPrevented).toBe(0)
    })
  }

  test('AC-17 arbitrates the wide-fit coffee targets at 1920×900', async ({ page }) => {
    test.setTimeout(ciTimeout(240_000, 900_000))
    await page.setViewportSize({ width: 1920, height: 900 })
    await enterCockpit(page)
    await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>('.responsive-stage')!
      const runtime = window as unknown as {
        __phase5PointerDowns?: { count: number; defaultPrevented: number }
      }
      runtime.__phase5PointerDowns = { count: 0, defaultPrevented: 0 }
      region.addEventListener('pointerdown', (event) => {
        runtime.__phase5PointerDowns!.count += 1
        if (event.defaultPrevented) runtime.__phase5PointerDowns!.defaultPrevented += 1
      })
    })

    await expectDragThenSubSlopClick(page, 'coffee-dripper')
    expect(await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getPointerActivationPoint('coffee-dripper'),
    )).toBeNull()
    await page.waitForTimeout(4_600)
    await expectDragThenSubSlopClick(page, 'coffee-mug')
    expect(await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getPointerActivationPoint('coffee-mug'),
    )).toBeNull()

    expect((await pointerActivationState(page)).activationCount).toBe(2)
    const pointerDowns = await page.evaluate(() => {
      const runtime = window as unknown as {
        __phase5PointerDowns?: { count: number; defaultPrevented: number }
      }
      return runtime.__phase5PointerDowns
    })
    expect(pointerDowns?.count).toBeGreaterThanOrEqual(4)
    expect(pointerDowns?.defaultPrevented).toBe(0)
  })

  test('AC-17 arbitrates the wide-fit decoration targets at 1920×900', async ({ page }) => {
    test.setTimeout(ciTimeout(180_000, 600_000))
    await page.setViewportSize({ width: 1920, height: 900 })
    await enterCockpit(page)
    await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>('.responsive-stage')!
      const runtime = window as unknown as {
        __phase5PointerDowns?: { count: number; defaultPrevented: number }
      }
      runtime.__phase5PointerDowns = { count: 0, defaultPrevented: 0 }
      region.addEventListener('pointerdown', (event) => {
        runtime.__phase5PointerDowns!.count += 1
        if (event.defaultPrevented) runtime.__phase5PointerDowns!.defaultPrevented += 1
      })
    })

    await expectDragThenSubSlopClick(page, 'tablet')
    expect(await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getPointerActivationPoint('tablet'),
    )).toBeNull()
    await expectDragThenSubSlopClick(page, 'shaker')
    expect(await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getPointerActivationPoint('shaker'),
    )).toBeNull()

    expect((await pointerActivationState(page)).activationCount).toBe(2)
    const pointerDowns = await page.evaluate(() => {
      const runtime = window as unknown as {
        __phase5PointerDowns?: { count: number; defaultPrevented: number }
      }
      return runtime.__phase5PointerDowns
    })
    expect(pointerDowns?.count).toBeGreaterThanOrEqual(4)
    expect(pointerDowns?.defaultPrevented).toBe(0)
  })
})
