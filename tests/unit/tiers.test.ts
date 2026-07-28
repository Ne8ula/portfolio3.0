// Unit tests for lib/responsive/tiers.ts (Phase 0, plan §A.2).
// Profile desktop-laptop-v1: normalMin 1024×600, normalMax 3440×1536.
import { describe, expect, it } from 'vitest'

import {
  REFLOW_FLOOR_WIDTH,
  expectedViewportTier,
  selectResponsiveTier,
} from '@/lib/responsive/tiers'

const PROFILE = 'desktop-laptop-v1'

describe('REFLOW_FLOOR_WIDTH', () => {
  it('is 320 (a guarantee inside zoom-narrow, not a tier)', () => {
    expect(REFLOW_FLOOR_WIDTH).toBe(320)
  })
})

describe('selectResponsiveTier (desktop-laptop-v1)', () => {
  it('exactly the normal minimum (1024×600) is normal', () => {
    expect(selectResponsiveTier({ w: 1024, h: 600 }, PROFILE)).toBe('normal')
  })

  it('exactly the normal maximum (3440×1536) is normal', () => {
    expect(selectResponsiveTier({ w: 3440, h: 1536 }, PROFILE)).toBe('normal')
  })

  it('a mid-range viewport is normal', () => {
    expect(selectResponsiveTier({ w: 1440, h: 900 }, PROFILE)).toBe('normal')
  })

  it('one pixel below the width minimum → zoom-narrow (1023×900)', () => {
    expect(selectResponsiveTier({ w: 1023, h: 900 }, PROFILE)).toBe('zoom-narrow')
  })

  it('one pixel below the height minimum → zoom-narrow (2000×599)', () => {
    expect(selectResponsiveTier({ w: 2000, h: 599 }, PROFILE)).toBe('zoom-narrow')
  })

  it('one pixel above the width maximum → large (3441×900)', () => {
    expect(selectResponsiveTier({ w: 3441, h: 900 }, PROFILE)).toBe('large')
  })

  it('above the maximum in both dimensions → large (3840×2160)', () => {
    expect(selectResponsiveTier({ w: 3840, h: 2160 }, PROFILE)).toBe('large')
  })

  it('conflict case: wide but too short (5000×300) → zoom-narrow wins', () => {
    expect(selectResponsiveTier({ w: 5000, h: 300 }, PROFILE)).toBe('zoom-narrow')
  })

  it('defaults to the desktop-laptop-v1 profile when profileId is omitted', () => {
    expect(selectResponsiveTier({ w: 1024, h: 600 })).toBe('normal')
    expect(selectResponsiveTier({ w: 1023, h: 900 })).toBe('zoom-narrow')
    expect(selectResponsiveTier({ w: 3441, h: 900 })).toBe('large')
  })
})

describe('expectedViewportTier', () => {
  it('maps large → large-smoke (viewport-case naming)', () => {
    expect(expectedViewportTier({ w: 3840, h: 2160 }, PROFILE)).toBe('large-smoke')
    expect(expectedViewportTier({ w: 3441, h: 900 }, PROFILE)).toBe('large-smoke')
  })

  it('passes normal through unchanged', () => {
    expect(expectedViewportTier({ w: 1024, h: 600 }, PROFILE)).toBe('normal')
    expect(expectedViewportTier({ w: 3440, h: 1536 }, PROFILE)).toBe('normal')
  })

  it('passes zoom-narrow through unchanged (incl. the conflict case)', () => {
    expect(expectedViewportTier({ w: 512, h: 300 }, PROFILE)).toBe('zoom-narrow')
    expect(expectedViewportTier({ w: 5000, h: 300 }, PROFILE)).toBe('zoom-narrow')
  })
})
