// Phase 0 baseline capture (plan §8: "Record current failures and reference
// screenshots at the §9 viewport matrix").
//
// Reference screenshots are for HUMAN review only — they are NOT §9.6.3
// scorecard baselines (those require Phase 4's deterministic scene state)
// and must never be used for pixel diffing.
//
// Usage: dev server on :3000 (npm run dev), then
//   npx tsx scripts/capture-baselines.ts
// Output: docs/baselines/phase-0/*.jpg + failures.md (measured deck
// hint↔card overlap per viewport — the Phase 6 bug, recorded, not fixed).

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { chromium } from '@playwright/test'
import { REQUIRED_VIEWPORT_CASES } from '@/lib/responsive/layout-contract'
import { intersects, type Rect } from '@/lib/responsive/geometry'

const OUT_DIR = join(process.cwd(), 'docs', 'baselines', 'phase-0')
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

type OverlapRow = {
  viewport: string
  hint: Rect | null
  card: Rect | null
  overlaps: boolean | 'no-data'
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (error) => console.error('pageerror:', error.message))

  await page.goto(BASE_URL)
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.skipIntro())
  await page.waitForFunction(
    () => Boolean(window.__setCockpitViewMode) && window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: 30_000 },
  )
  await page.waitForTimeout(2_000) // decal/texture rasterization

  const capture = async (view: string): Promise<void> => {
    for (const viewportCase of REQUIRED_VIEWPORT_CASES) {
      await page.setViewportSize({ width: viewportCase.w, height: viewportCase.h })
      await page.waitForTimeout(350)
      const file = join(OUT_DIR, `${view}-${viewportCase.w}x${viewportCase.h}.jpg`)
      await page.screenshot({ path: file, type: 'jpeg', quality: 55 })
      console.log('captured', file)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(250)
  }

  // Cockpit rest.
  await capture('cockpit')

  // Crate view.
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
  await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled(), undefined, {
    timeout: 30_000,
  })
  await capture('crate')

  // Deck view (record 0 playing) + measured hint↔card overlap per viewport.
  await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.playRecord(0))
  const overlapRows: OverlapRow[] = []
  for (const viewportCase of REQUIRED_VIEWPORT_CASES) {
    await page.setViewportSize({ width: viewportCase.w, height: viewportCase.h })
    await page.waitForTimeout(350)
    const file = join(OUT_DIR, `deck-${viewportCase.w}x${viewportCase.h}.jpg`)
    await page.screenshot({ path: file, type: 'jpeg', quality: 55 })
    const snapshot = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot())
    const hint = snapshot.overlays['browse-hint'] ?? null
    const card = snapshot.subject
    overlapRows.push({
      viewport: `${viewportCase.w}×${viewportCase.h}`,
      hint,
      card,
      overlaps: hint && card ? intersects(hint, card) : 'no-data',
    })
    console.log('captured', file)
  }

  const failing = overlapRows.filter((row) => row.overlaps === true)
  const lines = [
    '# Phase 0 baseline — recorded current failures',
    '',
    `Captured ${new Date().toISOString()} against the pre-responsive cockpit.`,
    'Screenshots in this directory are for human review only — never pixel',
    'baselines (§9.6.3 scorecard baselines wait for Phase 4 determinism).',
    '',
    '## Deck browse-hint ↔ holographic card overlap (fixed in Phase 6)',
    '',
    'The hint is viewport-anchored (`top: 76`) while the card is',
    'projection-driven, so their separation has no invariant (plan §2.1).',
    'Measured with `__COCKPIT_TEST_HOOKS__.getHudSnapshot()` in deck view:',
    '',
    '| Viewport | Hint rect (x,y,w,h) | Card rect (x,y,w,h) | Overlaps |',
    '|---|---|---|---|',
    ...overlapRows.map((row) => {
      const rect = (value: Rect | null): string =>
        value
          ? `${Math.round(value.x)},${Math.round(value.y)},${Math.round(value.w)},${Math.round(value.h)}`
          : '—'
      return `| ${row.viewport} | ${rect(row.hint)} | ${rect(row.card)} | ${String(row.overlaps)} |`
    }),
    '',
    `**${failing.length} of ${overlapRows.length} viewports overlap today.**`,
    'Tracked as `test.fixme` in e2e/smoke.spec.ts, linked to Phase 6.',
    '',
    '## Other known-current behavior recorded at capture time',
    '',
    '- Below ~1024×600 the cockpit has NO zoom/narrow tier yet: the stage',
    '  simply shrinks; HUD chrome overlaps content (Phase 1/5 work).',
    '- Reduced motion does not reach the boot timelines (§A.6.2, Phase 1).',
    '- No WebGL context-loss handling (§10.1, Phase 3).',
  ]
  writeFileSync(join(OUT_DIR, 'failures.md'), `${lines.join('\n')}\n`)
  console.log(`wrote failures.md — ${failing.length} overlapping viewport(s)`)

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
