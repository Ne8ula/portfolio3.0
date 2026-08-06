// Phase 4 AC-4 parity fixture recorder.
//
// Run against the development server before the focused-HUD sampler rewire:
//   npm run dev
//   npx tsx scripts/perf/record-phase4-hud-parity.ts
//
// The recorder intentionally reads the legacy window getters. Every fixture
// is accepted only after its complete geometry stays within
// HUD_RECT_EPSILON for ten consecutive animation frames.

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

import { chromium, type Page } from '@playwright/test'

import { HUD_RECT_EPSILON } from '@/lib/responsive/hud-layout'
import type { Rect } from '@/lib/responsive/geometry'

const OUTPUT_PATH = resolve(
  process.cwd(),
  'e2e',
  'fixtures',
  'phase4-hud-parity.json',
)
const VIEWPORT = { width: 1_440, height: 900 } as const
const CAPTURE = {
  seed: 'ax-cockpit-phase4-v1',
  timeMs: 12_000,
  pauseAmbient: true,
} as const
const REQUIRED_STABLE_FRAMES = 10
const STABILITY_TIMEOUT_MS = 60_000

const EXPECTED_SCENE_STREAMS = [
  'coffee/noise',
  'coffee/steam-glyphs',
  'glass-mac/pad-speckle',
  'glass-mac/screen-noise',
  'glass-mac/surface-speckle',
  'globe-cities',
  'incense/smoke-glyphs',
  'incense/stick-speckle',
  'starfield',
  'tea-set/etch',
  'tea-set/glaze',
  'vinyl-crate/cover-grain',
  'vinyl-crate/edge-wear',
] as const

const REQUIRED_HUD_IDENTIFIERS = [
  'browse-arrow-next',
  'browse-arrow-prev',
  'browse-hint',
  'crate-hover-brackets',
  'deck-project-link',
  'object-tag',
  'pc-hover-brackets',
  'screen-dialog',
  'vinyl-info-card',
] as const

type FixtureId =
  | 'cockpit-pc-hover'
  | 'cockpit-crate-hover'
  | 'monitor'
  | 'crate-record-selected'
  | 'deck-record-landed'

type ProjectedAnchor = {
  readonly id: string
  readonly x: number
  readonly y: number
}

type VisualCaptureState = {
  readonly active: boolean
  readonly seed: string | null
  readonly timeMs: number | null
  readonly streams: readonly string[]
}

type LegacyGeometrySample = {
  readonly snapshot: {
    readonly stage: Rect
    readonly subject: unknown
    readonly overlays: Readonly<Record<string, Rect>>
    readonly safeFrame: Rect
  }
  readonly legacy: {
    readonly pc: Rect | null
    readonly crate: Rect | null
    readonly anchors: readonly ProjectedAnchor[] | null
  }
  readonly visualCapture: VisualCaptureState
}

type RecordedFixture = {
  readonly mode: 'cockpit' | 'monitor' | 'crate' | 'deck'
  readonly state: string
  readonly geometry: LegacyGeometrySample
}

function parseBaseUrl(args: readonly string[]): string {
  const optionIndex = args.indexOf('--base-url')
  if (optionIndex === -1) {
    return process.env.BASE_URL ?? 'http://localhost:3000'
  }
  const value = args[optionIndex + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error('--base-url requires a URL')
  }
  return value
}

function gitHead(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim()
}

function stableValue(left: unknown, right: unknown): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) <= HUD_RECT_EPSILON
  }
  if (
    left === null ||
    right === null ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return Object.is(left, right)
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    return (
      left.length === right.length &&
      left.every((value, index) => stableValue(value, right[index]))
    )
  }

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        stableValue(leftRecord[key], rightRecord[key]),
    )
  )
}

async function readLegacyGeometry(page: Page): Promise<LegacyGeometrySample> {
  return page.evaluate(async () => {
    type LegacyWindow = Window & {
      __getCockpitPCRect?: (() => Rect | null) | null
      __getCockpitCrateRect?: (() => Rect | null) | null
      __getCockpitAnchors?: (() => ProjectedAnchor[] | null) | null
      __COCKPIT_TEST_HOOKS__?: {
        getHudSnapshot(): Promise<{
          stage: Rect
          subject: unknown
          overlays: Record<string, Rect>
          safeFrame: Rect
        }>
        getVisualCaptureState(): VisualCaptureState
      }
    }

    const cockpitWindow = window as LegacyWindow
    const hooks = cockpitWindow.__COCKPIT_TEST_HOOKS__
    if (hooks === undefined) {
      throw new Error('Phase 4 parity recorder: test hooks are unavailable')
    }
    const snapshot = await hooks.getHudSnapshot()
    return {
      snapshot: {
        stage: snapshot.stage,
        subject: snapshot.subject,
        overlays: snapshot.overlays,
        safeFrame: snapshot.safeFrame,
      },
      legacy: {
        pc: cockpitWindow.__getCockpitPCRect?.() ?? null,
        crate: cockpitWindow.__getCockpitCrateRect?.() ?? null,
        anchors: cockpitWindow.__getCockpitAnchors?.() ?? null,
      },
      visualCapture: hooks.getVisualCaptureState(),
    }
  })
}

async function pollStableGeometry(page: Page): Promise<LegacyGeometrySample> {
  const startedAt = Date.now()
  let previous: LegacyGeometrySample | null = null
  let consecutiveStableFrames = 0

  while (Date.now() - startedAt <= STABILITY_TIMEOUT_MS) {
    const current = await readLegacyGeometry(page)
    if (previous !== null && stableValue(previous, current)) {
      consecutiveStableFrames += 1
      if (consecutiveStableFrames >= REQUIRED_STABLE_FRAMES) return current
    } else {
      consecutiveStableFrames = 0
    }
    previous = current
  }

  throw new Error(
    `Phase 4 parity recorder: geometry did not remain within ` +
      `${HUD_RECT_EPSILON}px for ${REQUIRED_STABLE_FRAMES} consecutive frames`,
  )
}

async function preparePage(page: Page, baseUrl: string): Promise<void> {
  await page.goto(baseUrl)
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  await page.evaluate((capture) => {
    window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture(capture)
    window.__COCKPIT_TEST_HOOKS__!.skipIntro()
  }, CAPTURE)
  await page.waitForFunction(
    () =>
      Boolean(window.__setCockpitViewMode) &&
      window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 60_000 },
  )
}

async function exposeCockpitHover(
  page: Page,
  target: 'pc' | 'crate',
): Promise<void> {
  await page.evaluate((hoverTarget) => {
    const cockpitWindow = window as Window & {
      __cockpitHoveredTag?: string | null
    }
    cockpitWindow.__cockpitHoveredTag = hoverTarget
    window.dispatchEvent(
      new CustomEvent(
        hoverTarget === 'pc' ? 'cockpit-hover' : 'cockpit-crate-hover',
        { detail: { hovering: true } },
      ),
    )
  }, target)
  const bracket =
    target === 'pc' ? 'pc-hover-brackets' : 'crate-hover-brackets'
  await page.waitForFunction(
    ({ bracketId, tagId }) =>
      Boolean(
        document.querySelector(`[data-hud="${bracketId}"]`) &&
          document.querySelector(
            `[data-hud="object-tag"][data-tag-id="${tagId}"]`,
          ),
      ),
    { bracketId: bracket, tagId: target },
    { timeout: 30_000 },
  )
}

async function configureScenario(page: Page, fixtureId: FixtureId): Promise<{
  mode: RecordedFixture['mode']
  state: string
}> {
  if (fixtureId === 'cockpit-pc-hover') {
    await exposeCockpitHover(page, 'pc')
    return { mode: 'cockpit', state: 'pc-hover' }
  }
  if (fixtureId === 'cockpit-crate-hover') {
    await exposeCockpitHover(page, 'crate')
    return { mode: 'cockpit', state: 'crate-hover' }
  }
  if (fixtureId === 'monitor') {
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('monitor'))
    await page.waitForSelector('[data-hud="screen-dialog"]')
    return { mode: 'monitor', state: 'screen-active' }
  }
  if (fixtureId === 'crate-record-selected') {
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.selectRecord(0))
    await page.waitForSelector('[data-hud="vinyl-info-card"]')
    return { mode: 'crate', state: 'record-0-selected' }
  }

  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
  await page.waitForSelector('[data-hud="deck-project-link"]')
  return { mode: 'deck', state: 'record-0-landed' }
}

function isRect(value: unknown): value is Rect {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<Record<keyof Rect, unknown>>
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.w === 'number' &&
    typeof candidate.h === 'number'
  )
}

function overlaps(left: Rect, right: Rect): boolean {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  )
}

async function main(): Promise<void> {
  const baseUrl = parseBaseUrl(process.argv.slice(2))
  const browser = await chromium.launch()
  const fixtureIds: readonly FixtureId[] = [
    'cockpit-pc-hover',
    'cockpit-crate-hover',
    'monitor',
    'crate-record-selected',
    'deck-record-landed',
  ]
  const fixtures = {} as Record<FixtureId, RecordedFixture>

  try {
    for (const fixtureId of fixtureIds) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        colorScheme: 'dark',
      })
      await context.addInitScript(() => {
        localStorage.setItem('cockpit-theme', 'dark')
      })
      const page = await context.newPage()
      try {
        await preparePage(page, baseUrl)
        const scenario = await configureScenario(page, fixtureId)
        fixtures[fixtureId] = {
          ...scenario,
          geometry: await pollStableGeometry(page),
        }
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  const streamList = fixtures['deck-record-landed'].geometry.visualCapture.streams
  if (JSON.stringify(streamList) !== JSON.stringify(EXPECTED_SCENE_STREAMS)) {
    throw new Error(
      `Phase 4 parity recorder: named-stream coverage mismatch\n` +
        `expected ${JSON.stringify(EXPECTED_SCENE_STREAMS)}\n` +
        `received ${JSON.stringify(streamList)}`,
    )
  }

  const observedHudIdentifiers = [
    ...new Set(
      Object.values(fixtures).flatMap((fixture) =>
        Object.keys(fixture.geometry.snapshot.overlays),
      ),
    ),
  ].sort()
  const missingHudIdentifiers = REQUIRED_HUD_IDENTIFIERS.filter(
    (identifier) => !observedHudIdentifiers.includes(identifier),
  )
  if (missingHudIdentifiers.length > 0) {
    throw new Error(
      `Phase 4 parity recorder: missing HUD identifiers: ` +
        missingHudIdentifiers.join(', '),
    )
  }

  const deckGeometry = fixtures['deck-record-landed'].geometry.snapshot
  const deckHint = deckGeometry.overlays['browse-hint']
  if (deckHint === undefined || !isRect(deckGeometry.subject)) {
    throw new Error('Phase 4 parity recorder: deck overlap geometry is missing')
  }
  const phase6DeckOverlap = overlaps(deckHint, deckGeometry.subject)
  if (!phase6DeckOverlap) {
    throw new Error(
      'Phase 4 parity recorder: the known Phase 6 deck overlap disappeared',
    )
  }

  const document = {
    schemaVersion: 1,
    phase: 4,
    protocol: 'docs/phase-4-design.md AC-4',
    provenance: {
      sourceCommit: gitHead(),
      recordedAt: new Date().toISOString(),
      source: 'legacy getters before focused-HUD sampler rewiring',
    },
    viewport: { w: VIEWPORT.width, h: VIEWPORT.height, dpr: 1 },
    capture: CAPTURE,
    stability: {
      epsilonCssPx: HUD_RECT_EPSILON,
      consecutiveFrames: REQUIRED_STABLE_FRAMES,
    },
    assertions: {
      observedHudIdentifiers,
      expectedSceneStreams: EXPECTED_SCENE_STREAMS,
      phase6DeckOverlap,
    },
    fixtures,
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`)
  console.log(`Recorded Phase 4 HUD parity fixture: ${OUTPUT_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
