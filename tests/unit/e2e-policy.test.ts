import { describe, expect, it } from 'vitest'

import {
  CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES,
  CI_E2E_TIMING,
  LOCAL_E2E_TIMING,
  centeredTextOverlayMatches,
  centeredTextOverlayWidthTolerance,
  ciTimeout,
  measureCenteredTextOverlayDeltas,
  resolveE2eTiming,
} from '../../scripts/e2e-policy'

describe('E2E harness policy', () => {
  it('keeps local feedback budgets tight and gives CI bounded SwiftShader budgets', () => {
    expect(resolveE2eTiming('')).toBe(LOCAL_E2E_TIMING)
    expect(resolveE2eTiming('true')).toBe(CI_E2E_TIMING)
    expect(LOCAL_E2E_TIMING).toEqual({
      expect: 15_000,
      transition: 30_000,
      settle: 15_000,
      frameObservation: 120_000,
      test: 90_000,
    })
    expect(CI_E2E_TIMING).toEqual({
      expect: 60_000,
      transition: 120_000,
      settle: 120_000,
      frameObservation: 420_000,
      test: 600_000,
    })
    expect(ciTimeout(180_000, 600_000, '')).toBe(180_000)
    expect(ciTimeout(180_000, 600_000, 'true')).toBe(600_000)
  })

  it('accepts the observed Linux text width while pinning its authored center', () => {
    expect(CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES).toEqual({
      'object-tag': 8,
      'vinyl-info-card': 10.78125,
      'browse-hint': 13.59375,
    })
    expect(centeredTextOverlayWidthTolerance('object-tag')).toBe(8)
    expect(centeredTextOverlayWidthTolerance('screen-dialog')).toBeNull()

    const expected = {
      x: 1197.2578125,
      y: 235.390625,
      w: 129.578125,
      h: 37.390625,
    }
    const observedLinux = {
      x: 1199.65625,
      y: 235.390625,
      w: 124.78125,
      h: 37.390625,
    }

    expect(measureCenteredTextOverlayDeltas(observedLinux, expected)).toEqual({
      centerX: 0,
      y: 0,
      width: 4.796875,
      height: 0,
    })
    expect(centeredTextOverlayMatches(observedLinux, expected)).toBe(true)

    const observedLinuxCrateLabel = {
      x: expected.x + 4,
      y: expected.y,
      w: expected.w - 8,
      h: expected.h,
    }
    expect(
      measureCenteredTextOverlayDeltas(observedLinuxCrateLabel, expected),
    ).toEqual({ centerX: 0, y: 0, width: 8, height: 0 })
    expect(
      centeredTextOverlayMatches(observedLinuxCrateLabel, expected),
    ).toBe(true)

    const expectedVinylCard = {
      x: 582.9921875,
      y: 747.234375,
      w: 274.015625,
      h: 108.765625,
    }
    const observedLinuxVinylCard = {
      x: 588.3828125,
      y: 747.234375,
      w: 263.234375,
      h: 108.765625,
    }
    expect(
      measureCenteredTextOverlayDeltas(
        observedLinuxVinylCard,
        expectedVinylCard,
      ),
    ).toEqual({ centerX: 0, y: 0, width: 10.78125, height: 0 })
    expect(
      centeredTextOverlayMatches(
        observedLinuxVinylCard,
        expectedVinylCard,
        1,
        centeredTextOverlayWidthTolerance('vinyl-info-card')!,
      ),
    ).toBe(true)

    const expectedBrowseHint = {
      x: 562.4375,
      y: 76,
      w: 315.125,
      h: 32.390625,
    }
    const observedLinuxBrowseHint = {
      x: 569.234375,
      y: 76,
      w: 301.53125,
      h: 32.390625,
    }
    expect(
      measureCenteredTextOverlayDeltas(
        observedLinuxBrowseHint,
        expectedBrowseHint,
      ),
    ).toEqual({ centerX: 0, y: 0, width: 13.59375, height: 0 })
    expect(
      centeredTextOverlayMatches(
        observedLinuxBrowseHint,
        expectedBrowseHint,
        1,
        centeredTextOverlayWidthTolerance('browse-hint')!,
      ),
    ).toBe(true)
  })

  it('fails closed on near-miss text position, width, and height changes', () => {
    const expected = { x: 100, y: 50, w: 120, h: 30 }

    expect(
      centeredTextOverlayMatches(
        { x: 101.01, y: 50, w: 120, h: 30 },
        expected,
      ),
    ).toBe(false)
    for (const widthTolerance of Object.values(
      CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES,
    )) {
      expect(
        centeredTextOverlayMatches(
          {
            x: 100 - (widthTolerance + 0.01) / 2,
            y: 50,
            w: 120 + widthTolerance + 0.01,
            h: 30,
          },
          expected,
          1,
          widthTolerance,
        ),
      ).toBe(false)
    }
    expect(
      centeredTextOverlayMatches(
        { x: 100, y: 51.01, w: 120, h: 30 },
        expected,
      ),
    ).toBe(false)
    expect(
      centeredTextOverlayMatches(
        { x: 100, y: 50, w: 120, h: 31.01 },
        expected,
      ),
    ).toBe(false)
  })
})
