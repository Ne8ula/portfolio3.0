import { expect, test, type Page, type JSHandle } from '@playwright/test'
import type { DeckHudLayoutSnapshot } from '../components/cockpit/test-hooks'
import type { Rect } from '../lib/responsive/hud-layout'
import { HUD_COLLISION_GAP, HUD_RECT_EPSILON, HUD_SUBJECT_GAP, contains, intersects } from '../lib/responsive/hud-layout'
import { ciTimeout, resolveE2eTiming } from '../scripts/e2e-policy'

const timing = resolveE2eTiming()
const CAPTURE = { seed: 'ax-cockpit-phase6-v1', timeMs: 12_000, pauseAmbient: true as const }
const IDS = ['browse-hint', 'browse-arrow-prev', 'browse-arrow-next'] as const
const VIEWPORTS = [[1024,600],[1024,768],[1280,720],[1280,800],[1366,650],[1366,768],
  [1440,900],[1512,982],[1920,1080],[2048,1536],[2560,1440],[3440,1440]] as const
type DeckRuntime = Window & {
  __cockpitVinylSelect(delta: number): void
  __cockpitTurntable: { setTransform(value: {s: number}): void }
}

test.beforeEach(() => { test.setTimeout(ciTimeout(180_000, 600_000)) })

async function boot(page: Page, capture = true) {
  await page.addInitScript(() => {
    sessionStorage.removeItem('cockpit-intro-complete-v1')
    localStorage.setItem('cockpit-theme', 'light')
  })
  await page.goto('/')
  await page.waitForFunction(() => !!window.__COCKPIT_TEST_HOOKS__)
  await page.evaluate(async ({ capture, timeout }) => {
    await document.fonts.ready
    const h = window.__COCKPIT_TEST_HOOKS__!
    h.configureSettleTimeout(timeout)
    if (capture) h.configureVisualCapture(capture)
    h.skipIntro()
  }, { capture: capture ? CAPTURE : null, timeout: timing.settle })
  await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status === 'ready' &&
    window.__COCKPIT_TEST_HOOKS__!.isSettled(), undefined, { timeout: timing.transition })
}

async function land(page: Page, index = 0) {
  await page.evaluate(i => window.__COCKPIT_TEST_HOOKS__!.playRecord(i), index)
  await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled() &&
    window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.status === 'placed', undefined, { timeout: timing.settle })
  await nonblank(page)
}

// §9.6.2: synchronous render + read, independent of deterministic configuration.
async function nonblank(page: Page) {
  const metrics = await page.evaluate(() => {
    const w = window as unknown as { __cockpitRenderer: { domElement: HTMLCanvasElement;
      render(s: unknown, c: unknown): void }; __cockpitScene: unknown; __cockpitCamera: unknown }
    w.__cockpitRenderer.render(w.__cockpitScene, w.__cockpitCamera)
    const source = w.__cockpitRenderer.domElement
    const canvas = document.createElement('canvas')
    canvas.width = 160; canvas.height = Math.max(1, Math.round(160 * source.height / source.width))
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const colors = new Map<number, number>()
    for (let i = 0; i < pixels.length; i += 4) {
      const key = ((pixels[i]! >> 4) << 8) | ((pixels[i + 1]! >> 4) << 4) | (pixels[i + 2]! >> 4)
      colors.set(key, (colors.get(key) ?? 0) + 1)
    }
    return { colors: colors.size, dominant: Math.max(...colors.values()) / (pixels.length / 4),
      width: source.width, height: source.height }
  })
  expect(metrics.width).toBeGreaterThan(0); expect(metrics.height).toBeGreaterThan(0)
  expect(metrics.colors).toBeGreaterThanOrEqual(8); expect(metrics.dominant).toBeLessThan(.98)
}

async function read(page: Page) {
  return page.evaluate(async () => {
    const h = window.__COCKPIT_TEST_HOOKS__!
    const snapshot = await h.getHudSnapshot()
    // No await between snapshot resolution, committed probe, and DOM reads.
    const layout = h.getDeckHudLayout()
    const buttons = ['browse-arrow-prev', 'browse-arrow-next'].map(id => {
      const button = document.querySelector<HTMLButtonElement>(`[data-hud="${id}"] button`)
      const box = button?.getBoundingClientRect()
      return button && box ? { w: box.width, h: box.height, disabled: button.disabled } : null
    })
    const trigger = document.querySelector('[data-hud="accessibility-trigger"]')!.getBoundingClientRect()
    const stage = document.querySelector('[data-layout-region="cockpit-stage"]')!.getBoundingClientRect()
    return { snapshot, layout, buttons, settled: h.isSettled(), fit: h.getFocusFit(),
      trigger: { x: trigger.x - stage.x, y: trigger.y - stage.y, w: trigger.width, h: trigger.height } }
  })
}
async function committed(page: Page) {
  let value: Awaited<ReturnType<typeof read>>
  await expect.poll(async () => {
    value = await read(page)
    const { snapshot } = value
    return snapshot.publishedFrame !== null && snapshot.overlaysCommittedFrameId === snapshot.publishedFrame.frameId
  }).toBe(true)
  // Return the observation that passed, rather than acquiring another frame.
  return value!
}
function close(a: Rect, b: Rect, message = 'rect') {
  for (const key of ['x','y','w','h'] as const) expect(Math.abs(a[key] - b[key]), `${message}.${key}`).toBeLessThanOrEqual(HUD_RECT_EPSILON)
}
function geometry(value: Awaited<ReturnType<typeof read>>, minimum = 44, contained = false, steady = true) {
  const { snapshot: s, layout: p, buttons } = value
  if (steady) expect(value.settled).toBe(true)
  expect(s.publishedFrame!.deck.info!.busy).toBe(false)
  expect(s.publishedFrame!.deck.card).not.toBeNull()
  expect(s.overlaysCommittedFrameId).toBe(s.publishedFrame!.frameId)
  expect(p!.status).toBe('placed')
  expect(['beside','rail','edge']).toContain(p!.arrowTier)
  const rects = [p!.previous!, p!.next!, ...(p!.hint ? [p!.hint] : [])]
  for (const r of rects) {
    expect(Object.values(r).every(Number.isFinite)).toBe(true)
    expect(contains(s.safeFrame, r)).toBe(true)
    expect(intersects(r, p!.subject!, HUD_SUBJECT_GAP)).toBe(false)
    expect(intersects(r, p!.chrome![0]!, HUD_COLLISION_GAP)).toBe(false)
    if (!contained) expect(intersects(r, value.trigger)).toBe(false)
  }
  for (let i = 0; i < rects.length; i++) for (const r of rects.slice(i + 1)) {
    expect(intersects(rects[i]!, r, HUD_COLLISION_GAP)).toBe(false)
  }
  close(s.overlays['browse-arrow-prev']!, p!.previous!, 'previous DOM')
  close(s.overlays['browse-arrow-next']!, p!.next!, 'next DOM')
  if (p!.hint) close(s.overlays['browse-hint']!, p!.hint, 'hint DOM')
  else expect(s.overlays['browse-hint']).toBeUndefined()
  expect(p!.previous!.w).toBe(p!.next!.w); expect(p!.previous!.h).toBe(p!.next!.h)
  expect(p!.previous!.y).toBe(p!.next!.y)
  if (p!.arrowTier === 'beside') expect(p!.subject!.x - (p!.previous!.x + p!.previous!.w))
    .toBeCloseTo(p!.next!.x - (p!.subject!.x + p!.subject!.w), 6)
  for (const button of buttons) {
    expect(button!.w).toBeGreaterThanOrEqual(minimum); expect(button!.h).toBeGreaterThanOrEqual(minimum)
  }
}
function noSubject(p: DeckHudLayoutSnapshot | null) {
  expect(p!.status).toBe('no-subject'); expect(p!.sizes).not.toBeNull(); expect(p!.chrome).toHaveLength(1)
  for (const field of ['subject','hint','previous','next','arrowTier','hintTier','compact'] as const) expect(p![field], field).toBeNull()
}
async function state(page: Page, status: string) {
  await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.status ?? null)).toBe(status)
}
async function clear(page: Page) {
  if (page.isClosed()) return
  await page.evaluate(() => {
    window.__COCKPIT_TEST_HOOKS__?.setDeckHudSubjectOverride(null)
    window.__COCKPIT_TEST_HOOKS__?.forceDeckFitStatus(false)
  })
}

// Self-contained so Playwright serializes this exact derivation into the page.
// The fresh path reads and arms in one task while solveCount is still zero.
async function fixtureInPage({ name, fresh }: { name: 'F1' | 'F2' | 'F3'; fresh?: boolean }) {
  const h = window.__COCKPIT_TEST_HOOKS__!
  // Snapshot acquisition may await a sampler frame. The measured-state read,
  // fixture derivation and override arm below must then run synchronously.
  const arm = (snapshot: Awaited<ReturnType<typeof h.getHudSnapshot>>, p: DeckHudLayoutSnapshot) => {
    const check = (condition: boolean, label: string) => { if (!condition) throw new Error(`${name} precondition: ${label}`) }
    check(snapshot.overlaysCommittedFrameId === snapshot.publishedFrame?.frameId, 'same-frame handshake')
    if (fresh) {
      check(p.status === 'no-subject', 'fresh measured no-subject')
      check(p.solveCount === 0, 'solveCount === 0 before atomic arm')
    }
    const S = snapshot.safeFrame
    const { hint: f, hintCompact: c, arrow: a } = p.sizes!
    const Gs = 14, Gc = 8, HYS = 8
    let X: Rect
    const chromeClear = () => S.x + (S.w + c.w) / 2 + Gc <= p.chrome![0]!.x
    if (name === 'F1') {
      X = { x:S.x+(S.w-240)/2, y:S.y+Math.floor((f.h+Gs)/2), w:240, h:160 }
      check(X.y-S.y < f.h+Gs, 'above fails top containment')
      check(S.y+S.h-X.y-X.h >= f.h+Gs+Gc, 'below room >= Hf + Gs + Gc')
      check((S.w-240)/2 >= a.w+Gs, 'beside horizontal room')
      check(X.h/2+Gs-a.h/2 > Gc, 'below hint clears beside arrows')
    } else if (name === 'F2') {
      X = { x:S.x, y:S.y, w:120, h:200 }
      check(f.w > 120, 'Wf > 120')
      check(X.x+X.w+Gc <= S.x+(S.w-c.w)/2, 'compact clears subject horizontally')
      check(X.w >= 2*a.w+Gc, 'rail width >= 2 Aw + Gc')
      check(chromeClear(), 'compact right + Gc <= return left')
    } else {
      const Wx = Math.max(24, f.w-2*(Gs+a.w)-16)
      const Hx = a.h+2*(Gc-Gs)+HYS
      X = { x:S.x+(S.w-Wx)/2, y:S.y+f.h+Gs+40, w:Wx, h:Hx }
      check((f.w-Wx)/2-Gs-a.w >= 8, 'per-side horizontal overlap >= 8')
      check(Math.abs(Hx/2+Gs-a.h/2-(Gc+HYS/2)) <= .5, 'clearance = Gc + HYS/2')
      check(X.y-S.y >= f.h+Gs, 'above otherwise contained')
      check(X.x-Gs-a.w >= S.x && X.x+X.w+Gs+a.w <= S.x+S.w &&
        X.y+X.h/2-a.h/2 >= S.y && X.y+X.h/2+a.h/2 <= S.y+S.h, 'beside arrows contained')
      const arrowY=X.y+(X.h-a.h)/2, chrome=p.chrome![0]!
      for (const arrowX of [X.x-Gs-a.w,X.x+X.w+Gs]) check(
        arrowX+a.w+Gc <= chrome.x || chrome.x+chrome.w+Gc <= arrowX ||
        arrowY+a.h+Gc <= chrome.y || chrome.y+chrome.h+Gc <= arrowY,
        'beside arrows clear return chrome by Gc')
      check(X.y-S.y >= c.h+Gc, 'compact top clears subject')
      check(chromeClear(), 'compact right + Gc <= return left')
    }
    const armedAt = p.solveCount
    h.setDeckHudSubjectOverride(X)
    return { X, armedAt, beforeArm: p }
  }
  if (!fresh) {
    const snapshot = await h.getHudSnapshot()
    return arm(snapshot, h.getDeckHudLayout()!)
  }
  // Acquire the unchanged stage's HUD frame BEFORE starting the flight. An
  // awaited sampler read in the rAF poll can miss the entire first-measurement
  // window. The poll itself must only read the committed probe and arm it.
  const stageSnapshot = await h.getHudSnapshot()
  if (stageSnapshot.overlaysCommittedFrameId !== stageSnapshot.publishedFrame?.frameId) {
    throw new Error('F3 precondition: preflight same-frame handshake')
  }
  const flight = h.playRecord(0)
  // Observe rejection immediately, while the arming poll is still in progress.
  void flight.catch(() => {})
  const armed = await new Promise<ReturnType<typeof arm>>((resolve, reject) => {
    const deadline = performance.now() + 30_000
    const poll = () => {
      try {
        const p = h.getDeckHudLayout()
        if ((p?.solveCount ?? 0) > 0) throw new Error('fresh solveCount > 0 before F3 arm')
        if (p?.status === 'no-subject') {
          const box = document.querySelector('[data-layout-region="cockpit-stage"]')!.getBoundingClientRect()
          if (box.width !== stageSnapshot.liveFrame.stage.w || box.height !== stageSnapshot.liveFrame.stage.h) {
            throw new Error('F3 precondition: stage changed during first-solve arming')
          }
          // No await between observing this instance and arming its first solve.
          resolve(arm(stageSnapshot, p))
          return
        }
        if (performance.now() > deadline) throw new Error('fresh measured no-subject window missing')
        requestAnimationFrame(poll)
      } catch (error) { reject(error) }
    }
    requestAnimationFrame(poll)
  })
  await flight
  return armed
}

for (const [width,height] of VIEWPORTS) test(`P6-AC-01–07/13 matrix ${width}x${height}`, async ({ page }) => {
  const old = page.viewportSize()!
  try {
    await page.setViewportSize({ width,height }); await boot(page); await land(page)
    const first = await committed(page)
    geometry(first)
    expect(first.snapshot.overlays['return-control']!.h, 'standard shared return height').toBe(44)
    await expect(page.getByRole('button', { name:'previous record', exact:true })).toBeDisabled()
    await expect(page.getByRole('button', { name:'next record', exact:true })).toBeEnabled()
    const last = await page.evaluate(async () => (await window.__COCKPIT_TEST_HOOKS__!.getHudSnapshot()).publishedFrame!.deck.info!.count - 1)
    await land(page, last); geometry(await committed(page))
    await expect(page.getByRole('button', { name:'next record', exact:true })).toBeDisabled()
  } finally { await clear(page); await page.setViewportSize(old) }
})

test('P6-AC-07/24/26 forced status truth table, effective DOM, unsatisfiable precedence and warning episodes', async ({ page }) => {
  const warnings: string[] = []
  page.on('console', msg => { if (msg.type() === 'warning' && msg.text().startsWith('[deck-hud]')) warnings.push(msg.text()) })
  try {
    await boot(page, false); await land(page)
    const invalid = await page.evaluate(() => {
      const h = window.__COCKPIT_TEST_HOOKS__!
      const force = h.forceDeckFitStatus as (...args: unknown[]) => void
      const set = h.setDeckHudSubjectOverride as (rect: unknown) => void
      const rows: unknown[][] = [[true],[true,undefined],[true,null],[true,'bad'],[true,1],[true,{}],
        ...[null,'invalid-target','invalid-stage','invalid-input','unfittable-at-max',0,false,{},[],NaN].map(r => [false,r]),
        ...[0,1,'true',null,undefined,{},[]].map(v => [v,'invalid-target'])]
      const rects: unknown[] = [undefined,{},[],true,'rect',1,{x:0,y:0,w:1,h:1,extra:1}]
      rects.push({x:0,y:0,w:1,h:1,[Symbol('extra')]:1})
      rects.push(Object.defineProperty({x:0,y:0,w:1,h:1},'extra',{value:1}))
      for (const key of ['x','y','w','h']) {
        for (const value of [NaN,Infinity,-Infinity,'1',null,undefined]) rects.push({...{x:0,y:0,w:1,h:1},[key]:value})
        const missing: Record<string,number> = {x:0,y:0,w:1,h:1}; delete missing[key]; rects.push(missing)
      }
      for (const key of ['w','h']) for (const value of [0,-1]) rects.push({...{x:0,y:0,w:1,h:1},[key]:value})
      return [...rows.map(args => () => force(...args)), ...rects.map(r => () => set(r))].map(call => {
        const before = h.getDeckHudLayout()
        let error = ''
        try { call() } catch (e) { error = String(e) }
        return { before, after:h.getDeckHudLayout(), error }
      })
    })
    for (const result of invalid) { expect(result.error).toContain('__COCKPIT_TEST_HOOKS__:'); expect(result.after).toEqual(result.before) }
    const readonly = await page.evaluate(() => {
      const h=window.__COCKPIT_TEST_HOOKS__!, before=h.getDeckHudLayout()!
      const copy=h.getDeckHudLayout()!
      if (copy.subject) (copy.subject as {x:number}).x=-9999
      if (copy.sizes) (copy.sizes.arrow as {w:number}).w=9999
      return {before,after:h.getDeckHudLayout()}
    })
    expect(readonly.after).toEqual(readonly.before)
    expect(Object.keys(readonly.before).sort()).toEqual([
      'status','fitDegraded','fitReason','arrowTier','hintTier','compact','solveCount',
      'subject','chrome','sizes','hint','previous','next',
    ].sort())
    // Exactly four own fields are accepted even when non-enumerable. The
    // setter must copy their scalar values, not spread an empty enumerable set.
    const nonEnumerable = await page.evaluate(() => {
      const h=window.__COCKPIT_TEST_HOOKS__!, subject=h.getDeckHudLayout()!.subject!
      const expected={...subject,x:subject.x+3}
      const rect=Object.defineProperties({},Object.fromEntries(Object.entries(expected).map(([key,value]) => [key,{value}])))
      h.setDeckHudSubjectOverride(rect as Rect)
      return expected
    })
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.subject)).toEqual(nonEnumerable)
    await state(page,'placed')
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.setDeckHudSubjectOverride(null))
    for (const reason of ['invalid-target','invalid-stage','invalid-input','unfittable-at-max'] as const) {
      await page.evaluate(r => window.__COCKPIT_TEST_HOOKS__!.forceDeckFitStatus(true,r), reason)
      await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.fitReason)).toBe(reason)
      const v = await committed(page)
      expect(v.layout!.fitDegraded).toBe(true); expect(v.fit!.status).toBe('fit')
      expect(v.layout!.hintTier).toBe('hidden'); geometry(v)
      await expect(page.locator('[data-hud="browse-hint"]')).toHaveCount(0)
      await expect(page.getByRole('button', { name:'next record', exact:true })).toBeEnabled()
    }
    const S = (await committed(page)).snapshot.safeFrame
    for (let episode = 1; episode <= 2; episode++) {
      await page.evaluate(s => window.__COCKPIT_TEST_HOOKS__!.setDeckHudSubjectOverride(s), S)
      await state(page,'unsatisfiable')
      const p = (await committed(page)).layout!
      expect(p.fitDegraded).toBe(true); expect(p.sizes).not.toBeNull(); expect(p.chrome).toHaveLength(1)
      for (const key of ['hint','previous','next','arrowTier','hintTier','compact'] as const) expect(p[key]).toBeNull()
      for (const id of IDS) await expect(page.locator(`[data-hud="${id}"]`)).toHaveCount(0)
      expect(warnings).toHaveLength(episode)
      const start = await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta().publishCount)
      await page.waitForFunction(n => window.__COCKPIT_TEST_HOOKS__!.getHudFrameMeta().publishCount > n+5, start,
        {timeout:timing.frameObservation})
      expect(warnings).toHaveLength(episode)
      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.setDeckHudSubjectOverride(null))
      await state(page,'placed')
      expect((await committed(page)).layout!.hintTier).toBe('hidden')
    }
    // Both accepted clearing rows; effective state is checked after each commit.
    for (const explicit of [false,true]) {
      await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.forceDeckFitStatus(true,'invalid-target'))
      await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.fitDegraded)).toBe(true)
      await page.evaluate(flag => {
        const h=window.__COCKPIT_TEST_HOOKS__!
        if (flag) h.forceDeckFitStatus(false,undefined); else h.forceDeckFitStatus(false)
      }, explicit)
      await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.fitDegraded)).toBe(false)
      expect((await committed(page)).layout!.fitReason).toBeNull()
      await expect(page.locator('[data-hud="browse-hint"]')).toHaveCount(1)
    }
    await page.keyboard.press('Escape')
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))
    expect(await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout())).toBeNull()
    await land(page)
    expect((await committed(page)).layout!.fitDegraded).toBe(false)
  } finally { await clear(page) }
})

test('P6-AC-12 browser F1 → F2 → F3 retains compact until full recovery', async ({ page }) => {
  try {
    await boot(page); await land(page)
    for (const [name,tier] of [['F1','below'],['F2','compact-top'],['F3','compact-top']] as const) {
      const { X } = await page.evaluate(fixtureInPage, { name })
      await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.hintTier)).toBe(tier)
      const v = await committed(page); close(v.layout!.subject!,X); geometry(v)
      expect(v.layout!.compact).toBe(name !== 'F1')
      if (name === 'F1') expect(v.layout!.arrowTier).toBe('beside')
    }
    await clear(page)
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.compact)).toBe(false)
  } finally { await clear(page) }
})

test('P6-AC-09/26(g) F3 is first solve after exit with F2 still compact', async ({ page }) => {
  try {
    await boot(page)
    expect(await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout())).toBeNull()
    const error = await page.evaluate(() => {
      try { window.__COCKPIT_TEST_HOOKS__!.setDeckHudSubjectOverride({x:16,y:16,w:120,h:200}) }
      catch (e) { return String(e) }
      return ''
    })
    expect(error).toContain('__COCKPIT_TEST_HOOKS__: DeckHud not ready')
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.setDeckHudSubjectOverride(null))
    await land(page)
    close((await committed(page)).layout!.subject!, (await committed(page)).snapshot.publishedFrame!.deck.card!)
    await page.evaluate(fixtureInPage, { name:'F2' as const })
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.compact)).toBe(true)
    // Deliberately do not clear F2: its last committed solve must be compact.
    await page.keyboard.press('Escape')
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout())).toBeNull()
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('cockpit'))
    expect((await committed(page)).snapshot.publishedFrame!.deck.card).toBeNull()
    for (const id of IDS) await expect(page.locator(`[data-hud="${id}"]`)).toHaveCount(0)
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.enterView('crate'))
    const { X, armedAt, beforeArm } = await page.evaluate(fixtureInPage, { name:'F3' as const, fresh:true })
    noSubject(beforeArm)
    expect(armedAt).toBe(0)
    await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
    await nonblank(page)
    const v = await committed(page)
    close(v.layout!.subject!,X); expect(v.layout!.solveCount).toBeGreaterThanOrEqual(1)
    // The mutation proof MUST fail here, never at the arming preconditions.
    expect(v.layout!.compact, 'fresh F3 must reset compact').toBe(false)
    expect(v.layout!.hintTier, 'fresh F3 hintTier').toBe('above')
    geometry(v)
    await clear(page)
    const natural = await committed(page)
    close(natural.layout!.subject!,natural.snapshot.publishedFrame!.deck.card!)
    expect(natural.layout!.fitDegraded).toBe(false)
  } finally { await clear(page) }
})

test('P6-AC-08 busy swap retains its anchor then hides persistent controls past grace', async ({ page }) => {
  try {
    await boot(page, false); await land(page)
    geometry(await committed(page))
    const observations = await page.evaluate(async (timeout) => {
      const h = window.__COCKPIT_TEST_HOOKS__!
      const stage = document.querySelector('[data-layout-region="cockpit-stage"]')!
      const buttons = ['browse-arrow-prev','browse-arrow-next'].map(id =>
        document.querySelector<HTMLButtonElement>(`[data-hud="${id}"] button`)!)
      const shells = buttons.map(b => b.parentElement!.parentElement!.parentElement!)
      type Observation = { p: DeckHudLayoutSnapshot | null; retained: boolean; grace: number | null;
        cardNull: boolean; hintPresent: boolean; ids: boolean[]; disabled: boolean[];
        x: (number | null)[]; hiddenSafe: boolean | null }
      const rows: Observation[] = []
      const unsafe: string[] = []
      let sampling = false
      let firstRetained: Rect | null = null
      let timer = 0
      let resolveGap!: () => void
      let rejectGap!: (error: Error) => void
      const gap = new Promise<void>((resolve, reject) => { resolveGap=resolve; rejectGap=reject })
      const sample = async () => {
        if (sampling) return
        sampling = true
        try {
          const s = await h.getHudSnapshot()
          if (s.overlaysCommittedFrameId !== s.publishedFrame?.frameId) return
          const p = h.getDeckHudLayout()
          const card = s.publishedFrame.deck.card
          const busy = s.publishedFrame.deck.info?.busy
          if (!busy) return
          if (card?.retained && !firstRetained) firstRetained = card
          const row: Observation = { p, retained:card?.retained === true,
            cardNull:card === null, hintPresent:!!document.querySelector('[data-hud="browse-hint"]'),
            grace:h.getHudFrameMeta().graceRemainingMs,
            ids:shells.map(n => n.hasAttribute('data-hud')), disabled:buttons.map(b => b.disabled),
            x:shells.map(n => n.hasAttribute('data-hud') ? n.getBoundingClientRect().x-stage.getBoundingClientRect().x : null),
            hiddenSafe:null }
          if (p?.status === 'no-subject') {
            const index = window.__cockpitDeck!.index
            const snapshot = JSON.stringify(p)
            let navigations = 0
            const navigation = () => { navigations++ }
            window.addEventListener('cockpit-view-mode', navigation)
            try {
              row.hiddenSafe = buttons.every((b, i) => {
                b.focus(); const unfocused = document.activeElement !== b
                b.click(); b.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }))
                b.dispatchEvent(new KeyboardEvent('keyup', { key:'Enter', bubbles:true }))
                return b.isConnected && b.disabled && unfocused &&
                  getComputedStyle(shells[i]!).visibility === 'hidden' &&
                  getComputedStyle(shells[i]!).pointerEvents === 'none' &&
                  shells[i]!.getAttribute('aria-hidden') === 'true'
              }) && window.__cockpitDeck!.index === index &&
                JSON.stringify(h.getDeckHudLayout()) === snapshot && navigations === 0
            } finally { window.removeEventListener('cockpit-view-mode', navigation) }
            rows.push(row); resolveGap(); return
          }
          rows.push(row)
        } catch (error) { rejectGap(error as Error) }
        finally { sampling = false }
      }
      const observer = new MutationObserver(() => {
        // Inspect EVERY DOM commit synchronously as well as collecting atomic
        // snapshot evidence. An in-flight snapshot must not hide an unsafe
        // intermediate commit from this guard.
        if (window.__cockpitDeck!.busy) shells.forEach((shell,i) => {
          const frame=stage.getAttribute('data-hud-frame')
          if (!buttons[i]!.disabled) unsafe.push(`${frame}: busy arrow enabled`)
          if (shell.hasAttribute('data-hud') &&
              Math.abs(shell.getBoundingClientRect().x-stage.getBoundingClientRect().x-36)<=4) {
            unsafe.push(`${frame}: stage-edge fallback`)
          }
        })
        void sample()
      })
      observer.observe(stage, { attributes:true, attributeFilter:['data-hud-frame'] })
      timer = window.setTimeout(() => rejectGap(new Error(`no busy gap: ${JSON.stringify(rows)}`)), timeout)
      try {
        ;(window as unknown as DeckRuntime).__cockpitVinylSelect(1)
        await gap
        return { rows, firstRetained, unsafe }
      } finally { clearTimeout(timer); observer.disconnect() }
    }, timing.transition)
    expect(observations.unsafe).toEqual([])
    const retained = observations.rows.filter(r => r.retained)
    expect(retained.length, 'a retained-card commit must be observed').toBeGreaterThan(0)
    for (const row of retained) {
      expect(row.p!.status).toBe('placed')
      close(row.p!.subject!, observations.firstRetained!, 'retained anchor')
      expect(row.grace).not.toBeNull()
      expect(row.grace!).toBeGreaterThan(0); expect(row.grace!).toBeLessThanOrEqual(350)
    }
    const gap = observations.rows.find(r => r.p?.status === 'no-subject')!
    expect(gap).toBeDefined(); noSubject(gap.p)
    expect(gap.cardNull).toBe(true); expect(gap.hintPresent).toBe(false); expect(gap.grace).toBeNull()
    expect(gap.ids).toEqual([false,false]); expect(gap.hiddenSafe).toBe(true)
    for (const row of observations.rows) {
      expect(row.disabled).toEqual([true,true])
      for (const x of row.x) if (x !== null) expect(Math.abs(x-36), 'no stage-edge fallback').toBeGreaterThan(4)
    }
    await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
    await nonblank(page); geometry(await committed(page))
  } finally { await clear(page) }
})

test('P6-AC-10 focused resize commits legal HUD within two production frames', async ({ page }) => {
  const original = page.viewportSize()!
  try {
    await boot(page); await land(page)
    for (const [width,height] of [[1024,600],[1280,720]]) {
      // Keep the notification, frame budget and DOM read in the page. Driver
      // round trips must not count against the two-frame placement budget.
      const observation = await page.evaluateHandle(({width,height}) => {
        const h=window.__COCKPIT_TEST_HOOKS__!
        let cancelled=false
        let onResize!: () => void
        let timer=0
        const result=new Promise<{value: Awaited<ReturnType<typeof read>>; elapsed: number}>((resolve,reject) => {
          timer=window.setTimeout(() => reject(new Error('resize observation timed out')),10000)
          onResize=() => {
            const start=h.getHudFrameMeta().computeCount
            const sample=async () => {
              try {
                const snapshot=await h.getHudSnapshot()
                if (cancelled) return
                const elapsed=h.getHudFrameMeta().computeCount-start
                if (elapsed>2) throw new Error(`HUD resize exceeded two frames: ${elapsed}`)
                if (snapshot.liveFrame.stage.w !== width || snapshot.liveFrame.stage.h !== height ||
                    snapshot.overlaysCommittedFrameId !== snapshot.publishedFrame?.frameId) {
                  void sample(); return
                }
                const stage=document.querySelector('[data-layout-region="cockpit-stage"]')!.getBoundingClientRect()
                const trigger=document.querySelector('[data-hud="accessibility-trigger"]')!.getBoundingClientRect()
                const buttons=['browse-arrow-prev','browse-arrow-next'].map(id => {
                  const b=document.querySelector<HTMLButtonElement>(`[data-hud="${id}"] button`)
                  const r=b?.getBoundingClientRect()
                  return b && r ? {w:r.width,h:r.height,disabled:b.disabled} : null
                })
                resolve({elapsed,value:{snapshot,layout:h.getDeckHudLayout(),buttons,settled:h.isSettled(),fit:h.getFocusFit(),
                  trigger:{x:trigger.x-stage.x,y:trigger.y-stage.y,w:trigger.width,h:trigger.height}}})
              } catch(error) { reject(error) }
            }
            void sample()
          }
          window.addEventListener('resize',onResize,{once:true})
        })
        void result.catch(() => {})
        return {result,dispose:() => {cancelled=true;clearTimeout(timer);window.removeEventListener('resize',onResize)}}
      },{width:width!,height:height!})
      try {
        await page.setViewportSize({width:width!,height:height!})
        const {value:early,elapsed}=await observation.evaluate(o => o.result)
        expect(elapsed,'HUD commit must follow resize within two frames').toBeLessThanOrEqual(2)
        await nonblank(page); geometry(early,44,false,false)
        await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
        geometry(await committed(page))
      } finally { await observation.evaluate(o => o.dispose()); await observation.dispose() }
    }
  } finally {
    await clear(page); await page.setViewportSize(original)
  }
})

test('P6-AC-14 entrance animation moves only the inner child on a frozen scene', async ({ page }) => {
  let style: Awaited<ReturnType<Page['addStyleTag']>> | undefined
  try {
    await boot(page)
    style = await page.addStyleTag({ content: IDS.map(id => `[data-hud="${id}"] > div > div`).join(',')+
      '{animation-duration:3000ms !important;animation-play-state:paused !important}' })
    await land(page); geometry(await committed(page))
    const samples = await page.evaluate(ids => ids.map(id => {
      const outer = document.querySelector<HTMLElement>(`[data-hud="${id}"]`)!
      const inner = outer.firstElementChild!.firstElementChild as HTMLElement
      const animation = inner.getAnimations().find(a => (a as CSSAnimation).animationName === 'termFadeIn')
      if (!animation) throw new Error(`${id}: inner termFadeIn missing`)
      animation.pause()
      return [1,1500,2999].map(time => {
        animation.currentTime=time
        const s=getComputedStyle(outer), child=getComputedStyle(inner)
        return { x:s.left, y:s.top, w:s.width, h:s.height, transform:s.transform,
          innerTransform:child.transform, opacity:Number(child.opacity) }
      })
    }), IDS)
    for (const rows of samples) {
      expect(new Set(rows.map(r => r.innerTransform)).size).toBeGreaterThan(1)
      expect(rows[0]!.opacity).toBeLessThan(rows[2]!.opacity)
      for (const row of rows) {
        expect(row.transform).toBe('none')
        expect([row.x,row.y,row.w,row.h]).toEqual([rows[0]!.x,rows[0]!.y,rows[0]!.w,rows[0]!.h])
      }
    }
  } finally { await style?.evaluate(n => n.parentNode?.removeChild(n)); await clear(page) }
})

test('P6-AC-15 reduced motion entry has immediate legal placement and no entrance animation', async ({ page }) => {
  try {
    await page.emulateMedia({ reducedMotion:'reduce' }); await boot(page); await land(page)
    geometry(await committed(page))
    for (const id of IDS) {
      expect(await page.locator(`[data-hud="${id}"]`).evaluate(n =>
        n.getAnimations({ subtree:true }).filter(a => (a as CSSAnimation).animationName === 'termFadeIn').length)).toBe(0)
    }
  } finally { await clear(page); await page.emulateMedia({ reducedMotion:null }) }
})

test('P6-AC-16 light and dark theme have identical deck geometry', async ({ page }) => {
  try {
    await boot(page); await land(page)
    const light = await committed(page)
    geometry(light)
    // Focused modes intentionally have no theme button. Exercise the existing
    // appearance event consumed by CockpitApp without introducing deck chrome.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('cockpit-theme', {
      detail:{theme:'dark',source:'appearance-control',setting:'dark'},
    })))
    await expect.poll(() => page.evaluate(() => window.__cockpitTheme)).toBe('dark')
    await nonblank(page)
    const dark = await committed(page); geometry(dark)
    for (const id of [...IDS,'return-control']) close(light.snapshot.overlays[id]!,dark.snapshot.overlays[id]!,id)
  } finally {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('cockpit-theme', { detail:{theme:'light',source:'appearance-control',setting:'light'} })))
    await clear(page)
  }
})

for (const [width,height] of [[1024,600],[1440,900]] as const) {
  for (const sizeState of ['text','controls','combined'] as const) {
    test(`P6-AC-02/06/13/17 live ${sizeState} transition ${width}x${height}`, async ({ page }) => {
      const original = page.viewportSize()!
      let attributes: (string | null)[] = []
      try {
        await page.setViewportSize({width,height}); await boot(page); await land(page)
        attributes = await page.evaluate(() => ['data-a11y-text','data-a11y-controls'].map(k => document.documentElement.getAttribute(k)))
        const before = await committed(page)
        // The camera measurement generation has a real DOM lifetime: its
        // hidden replica tree mounts, then disappears only on completion.
        const replacement = await page.evaluateHandle(({ text, controls }) => {
          const stage = document.querySelector('[data-layout-region="cockpit-stage"]')!
          let mounted = false
          let resolve!: (value: boolean) => void
          const done = new Promise<boolean>(r => { resolve=r })
          const observer = new MutationObserver(records => {
            for (const record of records) {
              for (const n of Array.from(record.addedNodes)) if (n instanceof HTMLElement && n.style.left === '-10000px') mounted=true
              for (const n of Array.from(record.removedNodes)) if (n instanceof HTMLElement && n.style.left === '-10000px' && mounted) {
                observer.disconnect(); resolve(true)
              }
            }
          })
          observer.observe(stage, {childList:true,subtree:true})
          document.documentElement.setAttribute('data-a11y-text',text)
          document.documentElement.setAttribute('data-a11y-controls',controls)
          return { done, disconnect:() => observer.disconnect() }
        }, { text:sizeState === 'controls' ? 'standard' : 'large', controls:sizeState === 'text' ? 'standard' : 'large' })
        try {
          await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.solveCount),
            {timeout:timing.transition}).toBe(before.fit!.solveCount+1)
          expect(await replacement.evaluate(async r => await Promise.race([r.done,new Promise<boolean>(resolve => setTimeout(() => resolve(false),1000))]))).toBe(true)
        } finally { await replacement.evaluate(r => r.disconnect()); await replacement.dispose() }
        await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
        await nonblank(page)
        const after = await committed(page); geometry(after,sizeState === 'text' ? 44 : 56)
        expect(after.layout!.solveCount).toBeGreaterThan(before.layout!.solveCount)
        expect(after.layout!.sizes).not.toEqual(before.layout!.sizes)
        expect(after.fit!.lastSolveCause).toBe('measurement'); expect(after.fit!.status).toBe('fit')
        const camera = after.fit!.safeFrame, hud = after.snapshot.safeFrame
        expect(contains(hud,camera), 'camera frame inside HUD frame').toBe(true)
        const {w:W,h:H} = after.snapshot.liveFrame.stage
        const returnH=after.layout!.chrome![0]!.h, arrowW=after.layout!.sizes!.arrow.w, hintH=after.layout!.sizes!.hint.h
        expect(camera.y-16, 'top camera reservation >= returnH + 12').toBeGreaterThanOrEqual(returnH+12)
        expect(camera.x-16, 'left camera reservation >= arrowW + 16').toBeGreaterThanOrEqual(arrowW+16)
        expect(W-camera.x-camera.w-16, 'right camera reservation >= arrowW + 16').toBeGreaterThanOrEqual(arrowW+16)
        expect(H-camera.y-camera.h-16, 'bottom camera reservation >= hintH + 24').toBeGreaterThanOrEqual(hintH+24)
      } finally {
        if (attributes.length) await page.evaluate(values => ['data-a11y-text','data-a11y-controls'].forEach((key,i) => {
          const value=values[i]; if (value == null) document.documentElement.removeAttribute(key); else document.documentElement.setAttribute(key,value)
        }),attributes)
        await clear(page); await page.setViewportSize(original)
      }
    })
  }
}

test('P6-AC-18 DPR-only 1 to 2 does not move deck controls', async ({ page }) => {
  const session=await page.context().newCDPSession(page)
  try {
    await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
    await boot(page); await land(page)
    const before=await committed(page)
    await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:2,mobile:false})
    await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().main?.dpr === 2)
    await nonblank(page)
    const after=await committed(page); geometry(after)
    for (const id of [...IDS,'return-control']) close(before.snapshot.overlays[id]!,after.snapshot.overlays[id]!,id)
    // AC-18 pins CSS geometry. A renderer sizeVersion publication may cause
    // another memoized solve even when every placement input is unchanged.
    close(before.snapshot.liveFrame.stage,after.snapshot.liveFrame.stage,'DPR-only stage')
    close(before.layout!.subject!,after.layout!.subject!,'DPR-only subject')
  } finally { await session.send('Emulation.clearDeviceMetricsOverride'); await session.detach(); await clear(page) }
})

test('P6-AC-25 real camera failure yields measured no-subject and recovers', async ({ page }) => {
  try {
    await boot(page); await land(page)
    await page.evaluate(() => {
      window.__COCKPIT_TEST_HOOKS__!.completeAuthoredTweakGuard()
      ;(window as unknown as DeckRuntime).__cockpitTurntable.setTransform({s:50})
    })
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getFocusFit()?.reason)).toBe('unfittable-at-max')
    await state(page,'no-subject'); await nonblank(page)
    const failure=await committed(page)
    expect(failure.fit!.status).toBe('degraded')
    expect(failure.layout!.fitDegraded).toBe(true); expect(failure.layout!.fitReason).toBe('unfittable-at-max')
    expect(failure.snapshot.publishedFrame!.deck.card).toBeNull(); noSubject(failure.layout)
    for (const id of IDS) await expect(page.locator(`[data-hud="${id}"]`)).toHaveCount(0)
    await page.evaluate(() => (window as unknown as DeckRuntime).__cockpitTurntable.setTransform({s:1.75}))
    await state(page,'placed'); await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
    await nonblank(page)
    const recovery=await committed(page); expect(recovery.fit!.status).toBe('fit'); geometry(recovery)
    for (const id of IDS) await expect(page.locator(`[data-hud="${id}"]`)).toBeVisible()
  } finally {
    await page.evaluate(() => (window as unknown as DeckRuntime).__cockpitTurntable?.setTransform({s:1.75})); await clear(page)
  }
})

test('P6-AC-23/26(d,e) context rebuild disconnects controls and clears override and forced status', async ({ page }) => {
  let extension: JSHandle<WEBGL_lose_context> | undefined
  try {
    await boot(page); await land(page)
    const handles=await Promise.all(IDS.map(id => page.locator(`[data-hud="${id}"]`).elementHandle()))
    await page.evaluate(fixtureInPage,{name:'F2' as const})
    await page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.forceDeckFitStatus(true,'invalid-input'))
    await expect.poll(() => page.evaluate(() => window.__COCKPIT_TEST_HOOKS__!.getDeckHudLayout()?.fitDegraded)).toBe(true)
    extension=await page.evaluateHandle(() => {
      const r=(window as unknown as {__cockpitRenderer:{getContext():WebGLRenderingContext}}).__cockpitRenderer
      const ext=r.getContext().getExtension('WEBGL_lose_context')
      if (!ext) throw new Error('WEBGL_lose_context unavailable')
      ext.loseContext(); return ext
    })
    await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status === 'lost')
    const parked=await committed(page)
    expect(parked.snapshot.parked).toBe(true)
    await extension.evaluate(ext => (ext as WEBGL_lose_context).restoreContext())
    await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.getRendererState().status === 'ready',undefined,{timeout:timing.transition})
    await state(page,'placed'); await page.waitForFunction(() => window.__COCKPIT_TEST_HOOKS__!.isSettled())
    await nonblank(page)
    for (const handle of handles) { expect(await handle!.evaluate(n => n.isConnected)).toBe(false); await handle!.dispose() }
    const fresh=await committed(page), frame=fresh.snapshot.publishedFrame!
    expect(frame.frameId).toBeGreaterThan(parked.snapshot.liveFrame.frameId)
    expect(frame.deck.card!.sourceFrameId).toBe(frame.frameId)
    expect(frame.deck.card!.retained).toBe(false)
    close(fresh.layout!.subject!,frame.deck.card!)
    expect(fresh.layout!.fitDegraded).toBe(false); expect(fresh.layout!.fitReason).toBeNull()
    geometry(fresh)
    // Explicit clearing remains required even though the scene reset cleared it.
    await clear(page)
  } finally {
    await extension?.evaluate(ext => (ext as WEBGL_lose_context).restoreContext()); await extension?.dispose(); await clear(page)
  }
})

for (const [width,height] of [[800,450],[683,325],[512,300],[320,568]] as const) {
  test(`P6-AC-22 contained pan and D20 catalog exit ${width}x${height}`, async ({ page }) => {
    const original=page.viewportSize()!
    try {
      await page.setViewportSize({width,height}); await boot(page); await land(page,1)
      const before=await committed(page)
      expect(before.snapshot.liveFrame.stage).toEqual({x:0,y:0,w:1024,h:600})
      geometry(before,44,true)
      // Reachability is a closed set of real controls, excluding informational
      // hint and the in-scene screen. Use native pan transport and prove the
      // stage -> viewport conversion at the selected scroll offset.
      for (const id of ['browse-arrow-prev','browse-arrow-next','deck-project-link','return-control']) {
        const stageRect=before.snapshot.overlays[id]!
        const target=await page.evaluate(({r}) => {
          const region=document.querySelector<HTMLElement>('.responsive-stage')!
          const pan=window.__COCKPIT_TEST_HOOKS__!.getPanState()!
          const lowerX=Math.max(0,r.x+r.w-region.clientWidth), upperX=Math.min(pan.maxX,r.x)
          const lowerY=Math.max(0,r.y+r.h-region.clientHeight), upperY=Math.min(pan.maxY,r.y)
          if (lowerX>upperX || lowerY>upperY) throw new Error(`control outside pan range: ${JSON.stringify({r,pan,lowerX,upperX,lowerY,upperY})}`)
          const x=(lowerX+upperX)/2,y=(lowerY+upperY)/2
          region.scrollTo({left:x,top:y,behavior:'instant'})
          return {x,y}
        },{r:stageRect})
        // Native scrolling is the transport. The Phase 5 probe's x/y are
        // managed-input accumulator targets, not the committed viewport crop.
        // AC-22 uses its maxX/maxY above and proves actual visibility below.
        await expect.poll(() => page.evaluate(({x,y}) => {
          const region=document.querySelector<HTMLElement>('.responsive-stage')!
          return Math.max(Math.abs(region.scrollLeft-x),Math.abs(region.scrollTop-y))
        },target), {message:`${id}: native crop reaches requested pan`})
          .toBeLessThan(1)
        const visible=await page.evaluate(({id,r}) => {
          const region=document.querySelector<HTMLElement>('.responsive-stage')!, c=region.getBoundingClientRect()
          const stage=document.querySelector('[data-layout-region="cockpit-stage"]')!.getBoundingClientRect()
          const box=document.querySelector(`[data-hud="${id}"]`)!.getBoundingClientRect()
          return { expected:{x:stage.x+r.x,y:stage.y+r.y,w:r.w,h:r.h},
            actual:{x:box.x,y:box.y,w:box.width,h:box.height},
            viewport:{x:c.x+region.clientLeft,y:c.y+region.clientTop,w:region.clientWidth,h:region.clientHeight} }
        },{id,r:stageRect})
        close(visible.actual,visible.expected,`${id} stage to viewport`)
        expect(contains(visible.viewport,visible.actual),`${id} fully pan-reachable`).toBe(true)
        await nonblank(page)
        const after=await committed(page); geometry(after,44,true)
        for (const hud of IDS) close(before.snapshot.overlays[hud]!,after.snapshot.overlays[hud]!,`${hud} pans with stage`)
      }
      await page.locator('[data-hud="return-control"] button').click()
      await page.waitForFunction(() => window.__cockpitViewMode === 'cockpit' && window.__COCKPIT_TEST_HOOKS__!.isSettled())
      const link=page.locator('[data-hud="site-header"] a[href="/projects"]')
      await expect(link).toBeVisible()
      // Tab traversal, never element.focus(), proves the approved keyboard path.
      for (let i=0;i<40 && !await link.evaluate(n => n === document.activeElement);i++) await page.keyboard.press('Tab')
      await expect(link).toBeFocused(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/projects$/)
    } finally { await clear(page); await page.setViewportSize(original) }
  })
}
