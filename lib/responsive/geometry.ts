// Pure rectangle geometry for HUD layout (§3 layout law). No React, no
// WebGL, no DOM — unit-testable in isolation. Phase 4's
// components/cockpit/hud-layout.ts composes these into the focused-HUD
// solver; Phase 0 lands the primitives and their tests.
//
// Coordinate convention: stage coordinates — CSS pixels, +y down, origin at
// the cockpit stage's top-left corner (§1).

export type Rect = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type Size = { readonly w: number; readonly h: number }

export type Insets = {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export function isFiniteRect(rect: Rect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.w) &&
    Number.isFinite(rect.h) &&
    rect.w >= 0 &&
    rect.h >= 0
  )
}

/** Shrink `rect` by `insets`. Width/height floor at 0 (never negative). */
export function insetRect(rect: Rect, insets: Insets): Rect {
  return {
    x: rect.x + insets.left,
    y: rect.y + insets.top,
    w: Math.max(0, rect.w - insets.left - insets.right),
    h: Math.max(0, rect.h - insets.top - insets.bottom),
  }
}

/**
 * True when `a` and `b` overlap, treating rects closer than `gap` as
 * intersecting. Touching edges (distance exactly 0) with `gap = 0` do NOT
 * intersect — a shared edge is legal adjacency.
 */
export function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return (
    a.x < b.x + b.w + gap &&
    b.x < a.x + a.w + gap &&
    a.y < b.y + b.h + gap &&
    b.y < a.y + a.h + gap
  )
}

/** True when `inner` lies entirely within `outer` (inclusive edges). */
export function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  )
}

/** Center `size` horizontally on `anchor`, bottom edge `gap` above it. */
export function placeAbove(anchor: Rect, size: Size, gap: number): Rect {
  return {
    x: anchor.x + anchor.w / 2 - size.w / 2,
    y: anchor.y - gap - size.h,
    w: size.w,
    h: size.h,
  }
}

/** Center `size` horizontally on `anchor`, top edge `gap` below it. */
export function placeBelow(anchor: Rect, size: Size, gap: number): Rect {
  return {
    x: anchor.x + anchor.w / 2 - size.w / 2,
    y: anchor.y + anchor.h + gap,
    w: size.w,
    h: size.h,
  }
}

/** Center `size` vertically beside `anchor`, `gap` off the given side. */
export function placeBeside(
  anchor: Rect,
  size: Size,
  side: 'left' | 'right',
  gap: number,
): Rect {
  return {
    x: side === 'left' ? anchor.x - gap - size.w : anchor.x + anchor.w + gap,
    y: anchor.y + anchor.h / 2 - size.h / 2,
    w: size.w,
    h: size.h,
  }
}
