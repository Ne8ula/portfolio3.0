// Phase 0 browser smoke test (plan §8 Phase 0, §9.6) — Chromium only.
//
// Scope: boot reachable through the accessible control, layout identifiers
// present, harness can resize the viewport, §9.6.2 blank-canvas check, and
// the Phase −1 entrance-transform assertion. The initial-HTML content
// assertion (Phase 2) and the deck-overlap assertion (Phase 6) are named
// pending work via test.fixme — never passing baselines.
//
// Runs against a DEVELOPMENT server: __COCKPIT_TEST_HOOKS__ is compiled out
// of production bundles (components/cockpit/test-hooks.ts). Phase 8's
// production gate asserts the bridge is ABSENT from the production build.

import { expect, test, type Page } from '@playwright/test'

// §9.6.4-style error capture, applied to the smoke suite. Allowlist, don't
// disable: each entry names a documented-benign failure with a reason.
const CONSOLE_ERROR_ALLOWLIST: readonly { pattern: RegExp; reason: string }[] = [
  {
    // Weather chip: reverse-geocode/Open-Meteo can fail on localhost (CORS
    // or no geolocation) — documented expected fallback (handoff, §9.6.4).
    pattern: /open-meteo|geocod|geolocation|weather|Failed to fetch|ERR_FAILED|CORS/i,
    reason: 'weather chip network fallback is expected on localhost',
  },
]

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (CONSOLE_ERROR_ALLOWLIST.some((entry) => entry.pattern.test(text))) return
    errors.push(`console.error: ${text}`)
  })
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  return errors
}

async function waitForTestHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
}

/** skipIntro + wait for the scene to mount and settle at cockpit rest. */
async function enterCockpitDirect(page: Page): Promise<void> {
  await waitForTestHooks(page)
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible()
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 30_000 },
  )
  // Let decal/texture rasterization land a few frames before pixel checks.
  await page.waitForTimeout(1_500)
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
    await expect(stage).toBeVisible({ timeout: 30_000 })
    // data-layout-contract must resolve to a registry contract id (§A.7);
    // unit tests hold the registry itself to validateLayoutContracts.
    await expect(stage).toHaveAttribute('data-layout-contract', 'cockpit-v1')
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator('[data-hud="site-header"]')).toBeVisible()
  })

  test('harness can resize the viewport and the stage follows', async ({ page }) => {
    await page.goto('/')
    await enterCockpitDirect(page)

    for (const viewport of [
      { width: 1024, height: 600 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      // §9.3 allows two frames to settle after a resize notification.
      await page.waitForTimeout(100)
      const box = await page.locator('[data-layout-region="cockpit-stage"]').boundingBox()
      expect(box).not.toBeNull()
      expect(Math.abs((box?.width ?? 0) - viewport.width)).toBeLessThanOrEqual(1)
      expect(Math.abs((box?.height ?? 0) - viewport.height)).toBeLessThanOrEqual(1)
    }
  })

  test('§9.6.2 blank-canvas check: the frame actually rendered', async ({ page }) => {
    await page.goto('/')
    await enterCockpitDirect(page)

    // Phase 0 decision (§9.6.2): with preserveDrawingBuffer:false, read the
    // buffer via a synchronous in-frame forced re-render — render then
    // toDataURL in the same JS task, before the buffer is cleared. The flag
    // is never flipped in production.
    const metrics = await page.evaluate(() => {
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

      const probeW = 160
      const probeH = Math.max(1, Math.round((source.height / source.width) * 160))
      const probe = document.createElement('canvas')
      probe.width = probeW
      probe.height = probeH
      const ctx = probe.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(source, 0, 0, probeW, probeH)
      const { data } = ctx.getImageData(0, 0, probeW, probeH)

      const counts = new Map<number, number>()
      for (let i = 0; i < data.length; i += 4) {
        // 4-bit/channel quantization: robust to dithering/AA noise.
        const key =
          ((data[i]! >> 4) << 8) | ((data[i + 1]! >> 4) << 4) | (data[i + 2]! >> 4)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      const total = probeW * probeH
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

    expect(metrics, 'renderer/scene/camera bridge missing').not.toBeNull()
    expect(metrics!.bufferWidth).toBeGreaterThan(0)
    expect(metrics!.bufferHeight).toBeGreaterThan(0)
    // Blank, uniform, or near-uniform frames fail (§9.6.2). Bands are
    // deliberately loose — this is "did the render collapse", not a
    // scorecard baseline (§9.6.3 baselines wait for Phase 4 determinism).
    expect(metrics!.distinctColors).toBeGreaterThanOrEqual(8)
    expect(metrics!.dominantShare).toBeLessThan(0.98)
    expect(metrics!.nonDominantFraction).toBeGreaterThan(0.02)
  })

  test('Phase −1: entrance animation never moves the positioning anchor', async ({ page }) => {
    test.setTimeout(180_000)
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
      { timeout: 60_000 },
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

  // ── Named pending work — never recorded as passing (§8 Phase 0) ────────

  // Phase 2 (docs/hud-responsive-layout-plan.md §8 Phase 2): the initial
  // HTML must visibly link to /projects and /recruiter before hydration.
  // The current root is a client-only cockpit and must NOT be recorded as
  // passing this.
  test.fixme('initial HTML links to /projects and /recruiter before hydration (Phase 2)', async ({
    page,
  }) => {
    const response = await page.request.get('/')
    const html = await response.text()
    expect(html).toContain('href="/projects"')
    expect(html).toContain('href="/recruiter"')
  })

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
