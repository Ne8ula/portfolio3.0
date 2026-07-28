// Unit tests for lib/responsive/geometry.ts (Phase 0, plan §3 layout law).
import { describe, expect, it } from 'vitest'

import type { Insets, Rect, Size } from '@/lib/responsive/geometry'
import {
  contains,
  insetRect,
  intersects,
  isFiniteRect,
  placeAbove,
  placeBelow,
  placeBeside,
} from '@/lib/responsive/geometry'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

describe('isFiniteRect', () => {
  it('accepts an ordinary finite rect', () => {
    expect(isFiniteRect(rect(10, 20, 300, 150))).toBe(true)
  })

  it('accepts a zero-size rect (degenerate but finite)', () => {
    expect(isFiniteRect(rect(5, 5, 0, 0))).toBe(true)
  })

  it('rejects NaN in any field', () => {
    expect(isFiniteRect(rect(NaN, 0, 10, 10))).toBe(false)
    expect(isFiniteRect(rect(0, NaN, 10, 10))).toBe(false)
    expect(isFiniteRect(rect(0, 0, NaN, 10))).toBe(false)
    expect(isFiniteRect(rect(0, 0, 10, NaN))).toBe(false)
  })

  it('rejects infinities', () => {
    expect(isFiniteRect(rect(Infinity, 0, 10, 10))).toBe(false)
    expect(isFiniteRect(rect(0, -Infinity, 10, 10))).toBe(false)
    expect(isFiniteRect(rect(0, 0, Infinity, 10))).toBe(false)
  })

  it('rejects negative width or height', () => {
    expect(isFiniteRect(rect(0, 0, -1, 10))).toBe(false)
    expect(isFiniteRect(rect(0, 0, 10, -0.001))).toBe(false)
  })
})

describe('insetRect', () => {
  const insets = (top: number, right: number, bottom: number, left: number): Insets => ({
    top,
    right,
    bottom,
    left,
  })

  it('shrinks by the given insets and shifts the origin', () => {
    const out = insetRect(rect(10, 20, 100, 80), insets(5, 10, 15, 20))
    expect(out).toEqual({ x: 30, y: 25, w: 70, h: 60 })
  })

  it('clamps width and height at zero when insets exceed the size', () => {
    const out = insetRect(rect(0, 0, 30, 20), insets(15, 20, 15, 20))
    expect(out.w).toBe(0)
    expect(out.h).toBe(0)
    // Origin still moves by left/top even when the size collapses.
    expect(out.x).toBe(20)
    expect(out.y).toBe(15)
  })

  it('is an identity with zero insets', () => {
    const r = rect(3, 4, 50, 60)
    expect(insetRect(r, insets(0, 0, 0, 0))).toEqual(r)
  })
})

describe('intersects', () => {
  it('detects overlapping rects', () => {
    expect(intersects(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(true)
  })

  it('touching edges with gap = 0 do NOT intersect (legal adjacency)', () => {
    // Shared vertical edge at x = 10.
    expect(intersects(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false)
    // Shared horizontal edge at y = 10.
    expect(intersects(rect(0, 0, 10, 10), rect(0, 10, 10, 10))).toBe(false)
    // Corner touch.
    expect(intersects(rect(0, 0, 10, 10), rect(10, 10, 10, 10))).toBe(false)
  })

  it('disjoint rects do not intersect', () => {
    expect(intersects(rect(0, 0, 10, 10), rect(30, 30, 5, 5))).toBe(false)
  })

  it('gap > 0 makes near rects intersect', () => {
    const a = rect(0, 0, 10, 10)
    const b = rect(15, 0, 10, 10) // 5px apart horizontally
    expect(intersects(a, b, 0)).toBe(false)
    expect(intersects(a, b, 6)).toBe(true)
    // Gap exactly equal to the distance behaves like touching → no intersect.
    expect(intersects(a, b, 5)).toBe(false)
  })

  it('is symmetric', () => {
    const a = rect(0, 0, 10, 10)
    const b = rect(8, 8, 10, 10)
    expect(intersects(a, b)).toBe(intersects(b, a))
  })
})

describe('contains', () => {
  const outer = rect(0, 0, 100, 100)

  it('strictly-inside rect is contained', () => {
    expect(contains(outer, rect(10, 10, 50, 50))).toBe(true)
  })

  it('exact fit is contained (inclusive edges)', () => {
    expect(contains(outer, rect(0, 0, 100, 100))).toBe(true)
  })

  it('inner flush against an edge is contained', () => {
    expect(contains(outer, rect(0, 40, 20, 20))).toBe(true)
    expect(contains(outer, rect(80, 80, 20, 20))).toBe(true)
  })

  it('rejects rects poking past any edge', () => {
    expect(contains(outer, rect(-1, 0, 10, 10))).toBe(false)
    expect(contains(outer, rect(0, -1, 10, 10))).toBe(false)
    expect(contains(outer, rect(95, 0, 10, 10))).toBe(false)
    expect(contains(outer, rect(0, 95, 10, 10))).toBe(false)
  })
})

describe('placement helpers', () => {
  const anchor = rect(100, 100, 50, 20)
  const size: Size = { w: 30, h: 10 }
  const gap = 8

  it('placeAbove centers horizontally with the bottom edge `gap` above the anchor', () => {
    const out = placeAbove(anchor, size, gap)
    expect(out).toEqual({ x: 110, y: 82, w: 30, h: 10 })
    // Centered: same horizontal midpoint as the anchor.
    expect(out.x + out.w / 2).toBeCloseTo(anchor.x + anchor.w / 2, 10)
    // Gap between the placed bottom edge and the anchor top edge.
    expect(anchor.y - (out.y + out.h)).toBeCloseTo(gap, 10)
    // Adjacent, not intersecting.
    expect(intersects(out, anchor)).toBe(false)
  })

  it('placeBelow centers horizontally with the top edge `gap` below the anchor', () => {
    const out = placeBelow(anchor, size, gap)
    expect(out).toEqual({ x: 110, y: 128, w: 30, h: 10 })
    expect(out.x + out.w / 2).toBeCloseTo(anchor.x + anchor.w / 2, 10)
    expect(out.y - (anchor.y + anchor.h)).toBeCloseTo(gap, 10)
    expect(intersects(out, anchor)).toBe(false)
  })

  it("placeBeside 'left' centers vertically with the right edge `gap` left of the anchor", () => {
    const out = placeBeside(anchor, size, 'left', gap)
    expect(out).toEqual({ x: 62, y: 105, w: 30, h: 10 })
    expect(out.y + out.h / 2).toBeCloseTo(anchor.y + anchor.h / 2, 10)
    expect(anchor.x - (out.x + out.w)).toBeCloseTo(gap, 10)
    expect(intersects(out, anchor)).toBe(false)
  })

  it("placeBeside 'right' centers vertically with the left edge `gap` right of the anchor", () => {
    const out = placeBeside(anchor, size, 'right', gap)
    expect(out).toEqual({ x: 158, y: 105, w: 30, h: 10 })
    expect(out.y + out.h / 2).toBeCloseTo(anchor.y + anchor.h / 2, 10)
    expect(out.x - (anchor.x + anchor.w)).toBeCloseTo(gap, 10)
    expect(intersects(out, anchor)).toBe(false)
  })

  it('placement preserves the requested size', () => {
    for (const out of [
      placeAbove(anchor, size, gap),
      placeBelow(anchor, size, gap),
      placeBeside(anchor, size, 'left', gap),
      placeBeside(anchor, size, 'right', gap),
    ]) {
      expect(out.w).toBe(size.w)
      expect(out.h).toBe(size.h)
    }
  })
})
