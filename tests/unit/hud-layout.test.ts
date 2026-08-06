import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import * as cockpitHudLayout from '@/components/cockpit/hud-layout'
import type { FocusHudInput, Rect } from '@/lib/responsive/hud-layout'
import {
  HUD_COLLISION_GAP,
  HUD_COMPACT_HYSTERESIS,
  HUD_EDGE_GUTTER,
  HUD_MIN_HIT_SIZE,
  HUD_RECT_EPSILON,
  HUD_RECT_GRACE_MS,
  HUD_SUBJECT_GAP,
  ZERO_INSETS,
  computeSafeFrame,
  contains,
  intersects,
  rectsAlmostEqual,
  resolveFocusHudLayout,
} from '@/lib/responsive/hud-layout'

const stage = { x: 0, y: 0, w: 800, h: 600 }
const safeFrame = computeSafeFrame(stage)
const subject = { x: 300, y: 200, w: 200, h: 160 }

function input(overrides: Partial<FocusHudInput> = {}): FocusHudInput {
  return {
    kind: 'deck',
    stage,
    safeFrame,
    subject,
    chrome: [],
    sizes: {
      hint: { w: 100, h: 30 },
      hintCompact: { w: 72, h: 24 },
      arrow: { w: 44, h: 44 },
      info: { w: 160, h: 80 },
    },
    previousCompact: false,
    ...overrides,
  }
}

function expectPlaced(
  result: ReturnType<typeof resolveFocusHudLayout>,
): asserts result is Extract<typeof result, { status: 'placed' }> {
  expect(result.status).toBe('placed')
}

describe('shared HUD policy', () => {
  it('pins the owner-approved spacing and publication tokens', () => {
    expect({
      edge: HUD_EDGE_GUTTER,
      subject: HUD_SUBJECT_GAP,
      collision: HUD_COLLISION_GAP,
      hit: HUD_MIN_HIT_SIZE,
      epsilon: HUD_RECT_EPSILON,
      grace: HUD_RECT_GRACE_MS,
      hysteresis: HUD_COMPACT_HYSTERESIS,
    }).toEqual({
      edge: 16,
      subject: 14,
      collision: 8,
      hit: 44,
      epsilon: 0.25,
      grace: 350,
      hysteresis: 8,
    })
  })

  it('computes the edge-gutter safe frame before caller reservations', () => {
    expect(computeSafeFrame(stage)).toEqual({ x: 16, y: 16, w: 768, h: 568 })
    expect(computeSafeFrame(stage, { top: 10, right: 20, bottom: 30, left: 40 })).toEqual({
      x: 56,
      y: 26,
      w: 708,
      h: 528,
    })
    expect(ZERO_INSETS).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('uses an inclusive rectangle epsilon boundary', () => {
    const base = { x: 0, y: 0, w: 10, h: 10 }
    expect(rectsAlmostEqual(base, { ...base, x: 0.25 }, HUD_RECT_EPSILON)).toBe(
      true,
    )
    expect(
      rectsAlmostEqual(base, { ...base, x: 0.2501 }, HUD_RECT_EPSILON),
    ).toBe(false)
  })

  it('keeps the cockpit path a logic-free identity re-export', () => {
    expect(cockpitHudLayout.resolveFocusHudLayout).toBe(resolveFocusHudLayout)
    expect(cockpitHudLayout.computeSafeFrame).toBe(computeSafeFrame)
    expect(cockpitHudLayout.HUD_RECT_EPSILON).toBe(HUD_RECT_EPSILON)
    expect(readFileSync('components/cockpit/hud-layout.ts', 'utf8').trim()).toBe(
      "export * from '@/lib/responsive/hud-layout'",
    )
  })
})

describe('resolveFocusHudLayout info priority', () => {
  it('places info below before above and leaves mandatory geometry legal', () => {
    const result = resolveFocusHudLayout(input())
    expectPlaced(result)

    expect(result.info).toEqual({ x: 320, y: 374, w: 160, h: 80 })
    expect(result.previous).toEqual({ x: 242, y: 258, w: 44, h: 44 })
    expect(result.next).toEqual({ x: 514, y: 258, w: 44, h: 44 })
    expect(result.hint).toEqual({ x: 350, y: 156, w: 100, h: 30 })
    expect(result.compact).toBe(false)
  })

  it('uses the above tier when chrome blocks the below candidate', () => {
    const result = resolveFocusHudLayout(
      input({ chrome: [{ x: 300, y: 370, w: 200, h: 100 }] }),
    )
    expectPlaced(result)
    expect(result.info).toEqual({ x: 320, y: 106, w: 160, h: 80 })
  })

  it('uses a deterministic widest free strip after below and above fail', () => {
    const result = resolveFocusHudLayout(
      input({
        chrome: [
          { x: 300, y: 370, w: 200, h: 100 },
          { x: 300, y: 100, w: 200, h: 100 },
        ],
      }),
    )
    expectPlaced(result)
    expect(result.info).toEqual({ x: 16, y: 478, w: 160, h: 80 })
  })

  it('reports an unsatisfiable info card instead of violating constraints', () => {
    const tinyStage = { x: 0, y: 0, w: 100, h: 100 }
    expect(
      resolveFocusHudLayout(
        input({
          stage: tinyStage,
          safeFrame: tinyStage,
          subject: { x: 45, y: 45, w: 10, h: 10 },
          sizes: {
            hint: { w: 10, h: 10 },
            hintCompact: { w: 10, h: 10 },
            arrow: { w: 44, h: 44 },
            info: { w: 120, h: 120 },
          },
        }),
      ),
    ).toEqual({ status: 'unsatisfiable', failed: 'info' })
  })
})

describe('resolveFocusHudLayout arrow tiers', () => {
  const withoutInfo = {
    hint: { w: 100, h: 30 },
    hintCompact: { w: 72, h: 24 },
    arrow: { w: 44, h: 44 },
  } as const

  it('uses a balanced beside pair first and floors measured hit areas', () => {
    const result = resolveFocusHudLayout(
      input({
        sizes: { ...withoutInfo, arrow: { w: 20, h: 30 } },
      }),
    )
    expectPlaced(result)
    expect(result.previous).toEqual({ x: 242, y: 258, w: 44, h: 44 })
    expect(result.next).toEqual({ x: 514, y: 258, w: 44, h: 44 })
    expect(result.previous.w).toBeGreaterThanOrEqual(HUD_MIN_HIT_SIZE)
    expect(result.previous.h).toBeGreaterThanOrEqual(HUD_MIN_HIT_SIZE)
  })

  it('moves the pair together to the nearest horizontal rail', () => {
    const result = resolveFocusHudLayout(
      input({
        chrome: [
          { x: 220, y: 230, w: 80, h: 100 },
          { x: 500, y: 230, w: 80, h: 100 },
        ],
        sizes: withoutInfo,
      }),
    )
    expectPlaced(result)
    expect(result.previous).toEqual({ x: 352, y: 142, w: 44, h: 44 })
    expect(result.next).toEqual({ x: 404, y: 142, w: 44, h: 44 })
  })

  it('uses stage edges only after beside and rail placements fail', () => {
    const result = resolveFocusHudLayout(
      input({
        chrome: [
          { x: 220, y: 230, w: 80, h: 100 },
          { x: 500, y: 230, w: 80, h: 100 },
          { x: 330, y: 16, w: 140, h: 568 },
        ],
        sizes: withoutInfo,
      }),
    )
    expectPlaced(result)
    expect(result.previous.x).toBe(safeFrame.x)
    expect(result.next.x + result.next.w).toBe(safeFrame.x + safeFrame.w)
    expect(result.previous.y).toBe(result.next.y)
  })

  it('reports unsatisfiable arrows when no balanced pair can fit', () => {
    const tiny = { x: 0, y: 0, w: 70, h: 70 }
    expect(
      resolveFocusHudLayout(
        input({
          stage: tiny,
          safeFrame: tiny,
          subject: { x: 30, y: 30, w: 10, h: 10 },
          sizes: withoutInfo,
        }),
      ),
    ).toEqual({ status: 'unsatisfiable', failed: 'arrows' })
  })
})

describe('resolveFocusHudLayout hint tiers and compact hysteresis', () => {
  const withoutInfo = {
    hint: { w: 100, h: 30 },
    hintCompact: { w: 72, h: 24 },
    arrow: { w: 44, h: 44 },
  } as const

  it('tries full above then full below', () => {
    const result = resolveFocusHudLayout(
      input({
        chrome: [{ x: 330, y: 120, w: 140, h: 70 }],
        sizes: withoutInfo,
      }),
    )
    expectPlaced(result)
    expect(result.hint).toEqual({ x: 350, y: 374, w: 100, h: 30 })
    expect(result.compact).toBe(false)
  })

  it('enters compact mode with the measured compact rail size, then hides as a last resort', () => {
    const blockers: Rect[] = [
      { x: 330, y: 120, w: 140, h: 70 },
      { x: 330, y: 370, w: 140, h: 70 },
    ]
    const compact = resolveFocusHudLayout(
      input({ chrome: blockers, sizes: withoutInfo }),
    )
    expectPlaced(compact)
    expect(compact.hint).toEqual({ x: 364, y: 16, w: 72, h: 24 })
    expect(compact.compact).toBe(true)

    const hidden = resolveFocusHudLayout(
      input({
        chrome: [
          ...blockers,
          { x: 350, y: 16, w: 100, h: 30 },
          { x: 350, y: 554, w: 100, h: 30 },
        ],
        sizes: withoutInfo,
      }),
    )
    expectPlaced(hidden)
    expect(hidden.hint).toBeNull()
    expect(hidden.compact).toBe(true)
  })

  it('exits compact only with at least 8px collision slack', () => {
    const withSlack = (slack: number): FocusHudInput =>
      input({
        previousCompact: true,
        sizes: withoutInfo,
        chrome: [
          {
            x: 330,
            y: 100,
            w: 140,
            h: 56 - HUD_COLLISION_GAP - slack,
          },
          {
            x: 330,
            y: 404 + HUD_COLLISION_GAP + slack,
            w: 140,
            h: 40,
          },
        ],
      })

    const belowThreshold = resolveFocusHudLayout(
      withSlack(HUD_COMPACT_HYSTERESIS - 0.1),
    )
    expectPlaced(belowThreshold)
    expect(belowThreshold.compact).toBe(true)

    const atThreshold = resolveFocusHudLayout(
      withSlack(HUD_COMPACT_HYSTERESIS),
    )
    expectPlaced(atThreshold)
    expect(atThreshold.compact).toBe(false)
    expect(atThreshold.hint).toEqual({ x: 350, y: 156, w: 100, h: 30 })
  })
})

describe('resolveFocusHudLayout invariants', () => {
  it('keeps chrome, info, arrows, hint, and subject clear in precedence order', () => {
    const chrome = [{ x: 300, y: 370, w: 200, h: 100 }]
    const result = resolveFocusHudLayout(input({ chrome }))
    expectPlaced(result)

    const placed = [result.info, result.previous, result.next, result.hint].filter(
      (rect): rect is Rect => rect !== undefined && rect !== null,
    )
    for (const rect of placed) {
      expect(contains(safeFrame, rect)).toBe(true)
      expect(intersects(rect, subject, HUD_SUBJECT_GAP)).toBe(false)
    }
    for (let index = 0; index < placed.length; index += 1) {
      const current = placed[index]
      if (current === undefined) continue
      for (const other of placed.slice(index + 1)) {
        expect(intersects(current, other, HUD_COLLISION_GAP)).toBe(false)
      }
    }
  })

  it('canonicalizes chrome order for bit-for-bit deterministic output', () => {
    const chrome = [
      { x: 220, y: 230, w: 80, h: 100 },
      { x: 500, y: 230, w: 80, h: 100 },
      { x: 330, y: 16, w: 140, h: 80 },
    ]
    const forward = resolveFocusHudLayout(input({ chrome }))
    const reversed = resolveFocusHudLayout(input({ chrome: [...chrome].reverse() }))

    expect(reversed).toEqual(forward)
  })
})
