import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'
import type {
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'

type Phase4Runtime = Window & {
  __cockpitRenderer?: WebGLRenderer | null
  __cockpitScene?: Scene | null
  __cockpitCamera?: PerspectiveCamera | null
  __cockpitHoveredTag?: string | null
  __cockpitHoverPC?: boolean | null
  __cockpitVinylSelect?: ((delta: number) => void) | null
  __cockpitPC?: (Object3D & {
    setTransform(values: { yaw?: number }): void
  }) | null
  __getCockpitVinylHover?: (() => {
    x: number
    y: number
  } | null) | null
}

const parity = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'e2e/fixtures/phase4-hud-parity.json'),
    'utf8',
  ),
)

const CAPTURE = {
  seed: 'ax-cockpit-phase4-v1',
  timeMs: 12_000,
  pauseAmbient: true as const,
}

const PINNED_COCKPIT_BRIDGE_NAMES = [
  '__cockpitCamera',
  '__cockpitCoffee',
  '__cockpitCube',
  '__cockpitDeck',
  '__cockpitDecor',
  '__cockpitFPV',
  '__cockpitGLBDebug',
  '__cockpitGLBLoaded',
  '__cockpitHoverPC',
  '__cockpitHoveredTag',
  '__cockpitIncense',
  '__cockpitKeyboard',
  '__cockpitPC',
  '__cockpitRenderer',
  '__cockpitScene',
  '__cockpitSmoothedPitch',
  '__cockpitSmoothedYaw',
  '__cockpitTableGroup',
  '__cockpitTeaSet',
  '__cockpitTheme',
  '__cockpitTick',
  '__cockpitTurntable',
  '__cockpitViewMode',
  '__cockpitVinyl',
  '__cockpitVinylSelect',
  '__getCockpitAnchors',
  '__getCockpitCrateRect',
  '__getCockpitCubeScreenTarget',
  '__getCockpitDeckCardRect',
  '__getCockpitDeckInfo',
  '__getCockpitPCRect',
  '__getCockpitScreenRect',
  '__getCockpitVinylHover',
] as const

async function enterCockpit(
  page: Page,
  options: {
    capture?: boolean
    query?: string
    theme?: 'dark' | 'light'
  } = {},
): Promise<void> {
  const theme = options.theme ?? 'dark'
  await page.addInitScript((appearance) => {
    // Every call is a genuinely fresh pre-construction capture attempt even
    // when a test intentionally reuses one tab across full page loads.
    window.sessionStorage.removeItem('cockpit-intro-complete-v1')
    window.localStorage.setItem('cockpit-theme', appearance)
  }, theme)
  await page.goto(`/${options.query ?? ''}`)
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  if (options.capture) {
    await page.evaluate(async () => {
      await document.fonts.ready
    })
  }
  await page.evaluate((capture) => {
    if (capture) window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture(capture)
    window.__COCKPIT_TEST_HOOKS__!.skipIntro()
  }, options.capture ? CAPTURE : null)
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

async function snapshot(page: Page) {
  return page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot())
}

async function waitForHandshake(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const value = await snapshot(page)
      return (
        value.publishedFrame !== null &&
        value.overlaysCommittedFrameId === value.publishedFrame.frameId
      )
    })
    .toBe(true)
}

async function waitForVisualAssets(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getVisualAssetState().pending,
        ),
      { timeout: 45_000 },
    )
    .toBe(0)
  const assets = await page.evaluate(
    () => window.__COCKPIT_TEST_HOOKS__!.getVisualAssetState(),
  )
  expect(assets.failed).toBe(0)
}

function expectNumberClose(actual: number, expected: number, tolerance = 1): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

function expectRectClose(
  actual: { x: number; y: number; w: number; h: number },
  expected: { x: number; y: number; w: number; h: number },
  tolerance = 1,
): void {
  expectNumberClose(actual.x, expected.x, tolerance)
  expectNumberClose(actual.y, expected.y, tolerance)
  expectNumberClose(actual.w, expected.w, tolerance)
  expectNumberClose(actual.h, expected.h, tolerance)
}

function expectOverlayParity(
  actual: Awaited<ReturnType<typeof snapshot>>,
  fixtureName:
    | 'cockpit-pc-hover'
    | 'cockpit-crate-hover'
    | 'monitor'
    | 'crate-record-selected'
    | 'deck-record-landed',
  names: readonly string[],
): void {
  const expected = parity.fixtures[fixtureName].geometry.snapshot
  expectRectClose(actual.stage, expected.stage)
  expectRectClose(actual.safeFrame, expected.safeFrame)
  for (const name of names) {
    expect(
      actual.overlays[name],
      `${fixtureName}: missing [data-hud="${name}"]`,
    ).toBeDefined()
    expectRectClose(actual.overlays[name]!, expected.overlays[name])
  }
}

function assertFrameProvenance(frame: {
  frameId: number
  monitor: { sourceFrameId: number } | null
  deck: {
    card: { sourceFrameId: number; retained: boolean } | null
  }
  crate: { rect: { sourceFrameId: number } | null }
  pc: { sourceFrameId: number } | null
}): void {
  for (const projected of [
    frame.monitor,
    frame.crate.rect,
    frame.pc,
  ]) {
    if (projected) expect(projected.sourceFrameId).toBe(frame.frameId)
  }
  if (frame.deck.card) {
    if (frame.deck.card.retained) {
      expect(frame.deck.card.sourceFrameId).toBeLessThan(frame.frameId)
    } else {
      expect(frame.deck.card.sourceFrameId).toBe(frame.frameId)
    }
  }
}

async function screenCorners(page: Page) {
  return page.locator('[data-hud="screen-dialog"]').evaluate((element) => {
    const node = element as HTMLElement
    const style = getComputedStyle(node)
    const matrix = new DOMMatrix(style.transform)
    const width = Number.parseFloat(style.width)
    const height = Number.parseFloat(style.height)
    const left = node.offsetLeft
    const top = node.offsetTop
    const project = (x: number, y: number) => {
      const point = matrix.transformPoint(new DOMPoint(x, y))
      return { x: left + point.x / point.w, y: top + point.y / point.w }
    }
    return {
      tl: project(0, 0),
      tr: project(width, 0),
      bl: project(0, height),
      br: project(width, height),
    }
  })
}

async function forcedBuffer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const runtime = window as Phase4Runtime
    const renderer = runtime.__cockpitRenderer
    if (!renderer || !runtime.__cockpitScene || !runtime.__cockpitCamera) {
      throw new Error('render bridge missing')
    }
    renderer.render(runtime.__cockpitScene, runtime.__cockpitCamera)
    return renderer.domElement.toDataURL()
  })
}

async function loseContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const renderer = (window as Phase4Runtime).__cockpitRenderer
    if (!renderer) throw new Error('renderer missing')
    const extension = renderer
      .getContext()
      .getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('WEBGL_lose_context unavailable')
    ;(window as Window & {
      __phase4RestoreContext?: (() => void) | null
    }).__phase4RestoreContext = () => extension.restoreContext()
    extension.loseContext()
  })
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status,
      ),
    )
    .toBe('lost')
}

async function restoreContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = window as Window & {
      __phase4RestoreContext?: (() => void) | null
    }
    runtime.__phase4RestoreContext?.()
  })
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status,
        ),
      { timeout: 30_000 },
    )
    .toBe('ready')
}

test.describe('Phase 4 focused HUD', () => {
  test('AC-4/6/7: parity fixtures, atomic frames, and the DOM handshake', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const hudSource = readFileSync(
      resolve(process.cwd(), 'components/cockpit/cockpit-hud.tsx'),
      'utf8',
    )
    expect(hudSource).not.toContain('requestAnimationFrame')

    await enterCockpit(page, { capture: true })
    const bridgeNames = await page.evaluate(() =>
      Object.getOwnPropertyNames(window)
        .filter(
          (name) =>
            name.startsWith('__cockpit') || name.startsWith('__getCockpit'),
        )
        .sort(),
    )
    expect(bridgeNames).toEqual(PINNED_COCKPIT_BRIDGE_NAMES)

    await page.evaluate(() => {
      const runtime = window as Phase4Runtime
      runtime.__cockpitHoveredTag = 'pc'
      runtime.__cockpitHoverPC = true
      window.dispatchEvent(
        new CustomEvent('cockpit-hover', { detail: { hovering: true } }),
      )
    })
    await expect(page.locator('[data-hud="pc-hover-brackets"]')).toBeVisible()
    await page.locator('[data-hud="object-tag"]').evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })
    const pc = await snapshot(page)
    expect(pc.subject).toBeNull()
    expectRectClose(
      pc.liveFrame.pc!,
      parity.fixtures['cockpit-pc-hover'].geometry.legacy.pc,
    )
    const expectedAnchors =
      parity.fixtures['cockpit-pc-hover'].geometry.legacy.anchors
    expect(pc.liveFrame.anchors).toHaveLength(expectedAnchors.length)
    pc.liveFrame.anchors!.forEach((anchor, index) => {
      expect(anchor.id).toBe(expectedAnchors[index].id)
      expectNumberClose(anchor.x, expectedAnchors[index].x)
      expectNumberClose(anchor.y, expectedAnchors[index].y)
    })
    assertFrameProvenance(pc.liveFrame)
    expectOverlayParity(pc, 'cockpit-pc-hover', [
      'object-tag',
      'pc-hover-brackets',
      'screen-dialog',
    ])

    await page.evaluate(() => {
      const runtime = window as Phase4Runtime
      runtime.__cockpitHoveredTag = 'crate'
      runtime.__cockpitHoverPC = false
    })
    await expect(page.locator('[data-hud="crate-hover-brackets"]')).toBeVisible()
    await page.locator('[data-hud="object-tag"]').evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })
    const crateHover = await snapshot(page)
    expectRectClose(
      crateHover.liveFrame.crate.rect!,
      parity.fixtures['cockpit-crate-hover'].geometry.legacy.crate,
    )
    assertFrameProvenance(crateHover.liveFrame)
    expectOverlayParity(crateHover, 'cockpit-crate-hover', [
      'object-tag',
      'crate-hover-brackets',
      'screen-dialog',
    ])

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    await waitForHandshake(page)
    const monitor = await snapshot(page)
    expect(monitor.subject).toMatchObject({ visible: false })
    expect(monitor.liveFrame.monitor).not.toBeNull()
    assertFrameProvenance(monitor.liveFrame)
    const committedCorners = await screenCorners(page)
    const publishedCorners = monitor.publishedFrame!.monitor!.corners
    for (const key of ['tl', 'tr', 'bl', 'br'] as const) {
      expectNumberClose(committedCorners[key].x, publishedCorners[key].x)
      expectNumberClose(committedCorners[key].y, publishedCorners[key].y)
    }
    expectOverlayParity(monitor, 'monitor', ['screen-dialog'])
    const legacyMonitor =
      parity.fixtures.monitor.geometry.snapshot.subject.corners
    expectNumberClose(monitor.liveFrame.monitor!.corners.tl.x, legacyMonitor.TL.x)
    expectNumberClose(monitor.liveFrame.monitor!.corners.tl.y, legacyMonitor.TL.y)
    expectNumberClose(monitor.liveFrame.monitor!.corners.br.x, legacyMonitor.BR.x)
    expectNumberClose(monitor.liveFrame.monitor!.corners.br.y, legacyMonitor.BR.y)

    const consecutiveFrameIds = await page.evaluate(async () => {
      const first = await window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()
      const second = await window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()
      return [first.liveFrame.frameId, second.liveFrame.frameId]
    })
    expect(consecutiveFrameIds[1]).toBe(consecutiveFrameIds[0]! + 1)

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.selectRecord(0))
    await snapshot(page)
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
      )
      .toBe(true)
    const crate = await snapshot(page)
    expect(crate.liveFrame.crate.selection?.index).toBe(0)
    expectRectClose(
      crate.subject!,
      parity.fixtures['crate-record-selected'].geometry.snapshot.subject,
    )
    expectOverlayParity(crate, 'crate-record-selected', [
      'vinyl-info-card',
      'browse-hint',
      'browse-arrow-prev',
      'browse-arrow-next',
    ])
    const legacyCrateAnchor = await page.evaluate(() =>
      (window as Phase4Runtime).__getCockpitVinylHover?.() ?? null,
    )
    expectNumberClose(
      crate.liveFrame.crate.selection!.anchor!.x,
      legacyCrateAnchor!.x,
    )
    expectNumberClose(
      crate.liveFrame.crate.selection!.anchor!.y,
      legacyCrateAnchor!.y,
    )

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    await waitForHandshake(page)
    const deck = await snapshot(page)
    expectRectClose(
      deck.liveFrame.deck.card!,
      parity.fixtures['deck-record-landed'].geometry.snapshot.subject,
    )
    expectOverlayParity(deck, 'deck-record-landed', [
      'browse-hint',
      'browse-arrow-prev',
      'browse-arrow-next',
      'deck-project-link',
      'screen-dialog',
    ])
    assertFrameProvenance(deck.liveFrame)

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    await page.setViewportSize({ width: 1280, height: 800 })
    await waitForHandshake(page)
    const resized = await snapshot(page)
    const resizedCorners = await screenCorners(page)
    for (const key of ['tl', 'tr', 'bl', 'br'] as const) {
      expectNumberClose(
        resizedCorners[key].x,
        resized.publishedFrame!.monitor!.corners[key].x,
      )
      expectNumberClose(
        resizedCorners[key].y,
        resized.publishedFrame!.monitor!.corners[key].y,
      )
    }
  })

  test('AC-5/8: DPR-only changes preserve geometry and the epsilon gate idles', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await enterCockpit(page, { capture: true })
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    const before = await snapshot(page)
    const rendererBefore = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main,
    )

    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    })
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main?.dpr,
        ),
      )
      .toBe(2)
    const after = await snapshot(page)
    expectRectClose(after.liveFrame.deck.card!, before.liveFrame.deck.card!, 0.25)
    const rendererAfter = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main,
    )
    expect(rendererAfter!.bufferWidth).toBe(rendererBefore!.bufferWidth * 2)
    expect(rendererAfter!.bufferHeight).toBe(rendererBefore!.bufferHeight * 2)

    // AC-5 is complete above. Restore the reference DPR before AC-8's
    // 60-frame observation so software rendering does not spend that entire
    // window rasterizing a 2880×1800 drawing buffer.
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main?.dpr,
        ),
      )
      .toBe(1)

    const metaBefore = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta(),
    )
    // Observe the production counter rather than routing each frame through
    // getHudSnapshot()'s intentional 250 ms single-frame diagnostic deadline.
    await page.waitForFunction(
      (count) =>
        window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta().computeCount >=
        count + 60,
      metaBefore.computeCount,
      { polling: 100, timeout: 120_000 },
    )
    const metaAfter = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta(),
    )
    expect(metaAfter.computeCount - metaBefore.computeCount).toBeGreaterThanOrEqual(60)
    expect(metaAfter.publishCount).toBe(metaBefore.publishCount)
  })

  test('AC-8/9: live card motion publishes and deck swaps never fall back to stage edges', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpit(page)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))

    const moving = await page.evaluate(async () => {
      const started = performance.now()
      const seen = new Map<number, number>()
      while (performance.now() - started < 5_000 && seen.size < 2) {
        try {
          const value =
            await window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()
          const published = value.publishedFrame
          const y = published?.deck.card?.y
          if (published && typeof y === 'number') {
            seen.set(published.frameId, y)
          }
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes('HUD sampler compute timeout')
          ) {
            throw error
          }
          // A loaded software renderer can exceed the hook's intentional
          // 250 ms diagnostic deadline. Keep observing through the full bob
          // period; AC-6 covers the helper's one-frame semantics separately.
        }
      }
      return [...seen.values()]
    })
    expect(moving.length).toBeGreaterThanOrEqual(2)
    expect(new Set(moving.map((value) => value.toFixed(3))).size).toBeGreaterThan(1)

    const swap = await page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>(
        '[data-layout-region="cockpit-stage"]',
      )
      if (!stage) throw new Error('cockpit stage missing during deck swap')

      const readDom = () => {
        const arrow = document.querySelector(
          '[data-hud="browse-arrow-prev"]',
        ) as HTMLElement | null
        const button = arrow?.querySelector('button')
        return {
          arrowPresent: arrow !== null,
          arrowLeft: arrow?.getBoundingClientRect().left ?? null,
          arrowDisabled:
            button instanceof HTMLButtonElement ? button.disabled : null,
          linkPresent:
            document.querySelector('[data-hud="deck-project-link"]') !== null,
        }
      }
      const waitForCommit = (frameId: number) =>
        new Promise<void>((resolveCommit, rejectCommit) => {
          const committed = () =>
            stage.getAttribute('data-hud-frame') === String(frameId)
          if (committed()) {
            resolveCommit()
            return
          }
          const observer = new MutationObserver(() => {
            if (!committed()) return
            window.clearTimeout(timeout)
            observer.disconnect()
            resolveCommit()
          })
          const timeout = window.setTimeout(() => {
            observer.disconnect()
            rejectCommit(
              new Error(`HUD frame ${frameId} did not commit during deck swap`),
            )
          }, 2_000)
          observer.observe(stage, {
            attributes: true,
            attributeFilter: ['data-hud-frame'],
          })
        })
      const pendingSnapshot =
        window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()
      ;(window as Phase4Runtime).__cockpitVinylSelect?.(1)
      const retained = await pendingSnapshot
      await waitForCommit(retained.publishedFrame!.frameId)
      const retainedAt = performance.now()
      const observations = [
        {
          elapsedMs: 0,
          card: retained.liveFrame.deck.card,
          ...readDom(),
        },
      ]

      while (
        performance.now() - retainedAt < 5_000 &&
        observations.at(-1)?.card !== null
      ) {
        const current =
          await window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()
        await waitForCommit(current.publishedFrame!.frameId)
        observations.push({
          elapsedMs: performance.now() - retainedAt,
          card: current.liveFrame.deck.card,
          ...readDom(),
        })
      }

      return { retained, observations }
    })
    expect(swap.retained.liveFrame.deck.card?.retained).toBe(true)
    expect(swap.observations[0]).toMatchObject({
      arrowPresent: true,
      arrowDisabled: true,
      linkPresent: false,
    })
    expect(
      swap.observations
        .filter(
          (observation) =>
            observation.arrowPresent && observation.arrowLeft !== null,
        )
        .every((observation) => Math.abs(observation.arrowLeft! - 36) > 4),
    ).toBe(true)
    const expired = swap.observations.find(
      (observation) => observation.card === null,
    )
    expect(expired).toBeDefined()
    expect(expired!.elapsedMs).toBeGreaterThanOrEqual(300)
    expect(expired).toMatchObject({
      arrowPresent: false,
      linkPresent: false,
    })

    await expect
      .poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()), {
        timeout: 30_000,
      })
      .toBe(true)
    await expect(page.locator('[data-hud="browse-arrow-prev"]')).toBeVisible()
    await expect(page.locator('[data-hud="deck-project-link"]')).toBeVisible()

    await page.evaluate(() => {
      const runtime = window as Phase4Runtime
      runtime.__cockpitVinylSelect?.(-1)
      window.__setCockpitViewMode?.('cockpit')
    })
    await expect
      .poll(async () => (await snapshot(page)).liveFrame.deck.card)
      .toBeNull()
  })

  test('AC-10/16/17: validity, fixed capture buffers, and pinned ambient nodes', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpit(page, { capture: true })
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.selectRecord(0))
    await snapshot(page)
    await expect
      .poll(() =>
        page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.isSettled()),
      )
      .toBe(true)
    await waitForVisualAssets(page)
    const crateBuffer = await forcedBuffer(page)
    await page.waitForTimeout(550)
    expect(await forcedBuffer(page)).toBe(crateBuffer)

    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    await waitForVisualAssets(page)
    const state = await page.evaluate(
      () => window.__COCKPIT_TEST_HOOKS__!.getVisualCaptureState(),
    )
    expect(state.active).toBe(true)
    expect(state.streams).toEqual(parity.assertions.expectedSceneStreams)

    const firstNodes = await page.evaluate(() => {
      const scene = (window as Phase4Runtime).__cockpitScene
      const platter = scene?.getObjectByName('deck-platter-spin')
      const card = scene?.getObjectByName('deck-holo-card')
      if (!platter || !card) throw new Error('pinned ambient nodes missing')
      return {
        platter: platter.rotation.y,
        card: card.getWorldPosition(card.position.clone()).toArray(),
      }
    })
    const firstBuffer = await forcedBuffer(page)
    await page.waitForTimeout(550)
    const secondBuffer = await forcedBuffer(page)
    const secondNodes = await page.evaluate(() => {
      const scene = (window as Phase4Runtime).__cockpitScene!
      const platter = scene.getObjectByName('deck-platter-spin')!
      const card = scene.getObjectByName('deck-holo-card')!
      return {
        platter: platter.rotation.y,
        card: card.getWorldPosition(card.position.clone()).toArray(),
      }
    })
    expect(secondBuffer).toBe(firstBuffer)
    expect(secondNodes).toEqual(firstNodes)

    await page.evaluate(() =>
      window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'),
    )
    await page.evaluate(() => {
      const runtime = window as Phase4Runtime
      const camera = runtime.__cockpitCamera
      if (!camera) throw new Error('cockpit camera missing')
      // Force the authored screen behind the caller-provided near plane. The
      // render loop preserves camera.near while refreshing its projection, so
      // this exercises validity without racing the PC transform writer.
      camera.near = 100
      camera.updateProjectionMatrix()
      window.__cockpitViewMode = 'monitor'
    })
    await expect
      .poll(async () => (await snapshot(page)).liveFrame.monitor)
      .toBeNull()
    expect((await snapshot(page)).subject).toMatchObject({ visible: false })
    await expect(page.locator('[data-hud="screen-dialog"]')).toHaveCount(0)
    const badStyle = await page.locator('[data-hud]').evaluateAll((elements) =>
      elements.some((element) => /NaN|Infinity/.test((element as HTMLElement).style.cssText)),
    )
    expect(badStyle).toBe(false)
  })

  test('AC-13/14: canonical loads repeat while unconfigured scene randomness remains natural', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const seededBuffers: string[] = []
    for (let repeat = 0; repeat < 2; repeat += 1) {
      await enterCockpit(page, { capture: true })
      await waitForVisualAssets(page)
      seededBuffers.push(await forcedBuffer(page))
    }
    expect(seededBuffers[1]).toBe(seededBuffers[0])

    const naturalStarfields: string[] = []
    for (let repeat = 0; repeat < 2; repeat += 1) {
      await enterCockpit(page)
      expect(
        await page.evaluate(
          () => window.__COCKPIT_TEST_HOOKS__!.getVisualCaptureState().active,
        ),
      ).toBe(false)
      naturalStarfields.push(
        await page.evaluate(() => {
          const scene = (window as Phase4Runtime).__cockpitScene
          let signature = ''
          scene?.traverse((object) => {
            if (signature || object.type !== 'Points') return
            const attribute = (
              object as Object3D & {
                geometry?: {
                  getAttribute(name: string): {
                    count: number
                    array: ArrayLike<number>
                  }
                }
              }
            ).geometry?.getAttribute('position')
            if (!attribute || attribute.count !== 700) return
            signature = Array.from(attribute.array)
              .slice(0, 96)
              .map((value) => Number(value).toFixed(6))
              .join(',')
          })
          if (!signature) throw new Error('starfield buffer not found')
          return signature
        }),
      )
    }
    expect(naturalStarfields[1]).not.toBe(naturalStarfields[0])
  })

  test('AC-18: the query-gated debug overlay is inert and not a HUD record', async ({
    page,
  }) => {
    await enterCockpit(page, { query: '?hudDebug=1' })
    const overlay = page.locator('[data-hud-debug-overlay]')
    await expect(overlay).toBeVisible()
    await expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(await overlay.evaluate((element) => getComputedStyle(element).pointerEvents))
      .toBe('none')
    await expect(overlay.locator('[data-hud]')).toHaveCount(0)
    await expect(
      overlay.locator(
        'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
      ),
    ).toHaveCount(0)

    await page.goto('/')
    await expect(page.locator('[data-hud-debug-overlay]')).toHaveCount(0)
  })

  test('AC-15/23: parked snapshots freeze and rebuilds reset to fresh monotonic frames', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await enterCockpit(page)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
    const before = await snapshot(page)
    await loseContext(page)
    const parked = await snapshot(page)
    expect(parked.parked).toBe(true)
    expect(parked.liveFrame.frameId).toBeGreaterThanOrEqual(
      before.liveFrame.frameId,
    )
    await page.waitForTimeout(250)
    expect((await snapshot(page)).liveFrame.frameId).toBe(parked.liveFrame.frameId)

    await restoreContext(page)
    await expect(
      page.locator('[data-layout-region="cockpit-stage"]'),
    ).toBeFocused()
    const restored = await snapshot(page)
    expect(restored.parked).toBe(false)
    expect(restored.liveFrame.frameId).toBeGreaterThan(parked.liveFrame.frameId)
    expect(restored.liveFrame.deck.card?.retained).not.toBe(true)
    expect(restored.liveFrame.deck.card?.sourceFrameId).toBe(
      restored.liveFrame.frameId,
    )

    const lateError = await page.evaluate((capture) => {
      try {
        window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture(capture)
        return null
      } catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    }, CAPTURE)
    expect(lateError).toContain('reload and configure first')
  })

  test('AC-21: the Phase 6 overlap boundary remains explicit', () => {
    const smoke = readFileSync(resolve(process.cwd(), 'e2e/smoke.spec.ts'), 'utf8')
    expect(smoke).toContain('test.fixme')
    expect(smoke).toContain('Phase 6')
    expect(parity.assertions.phase6DeckOverlap).toBe(true)
  })
})
