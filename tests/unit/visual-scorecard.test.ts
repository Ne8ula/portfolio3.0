import { describe, expect, it } from 'vitest'

import {
  SCORECARD_DIAGNOSTIC_ALLOWLIST,
  SCORECARD_DPRS,
  SCORECARD_REPEATS,
  SCORECARD_THEMES,
  SCORECARD_VIEWPORTS,
  SCORECARD_VIEWS,
  assertCleanGitStatus,
  assertRendererAllowed,
  assertScorecardWithinBaseline,
  computeVisualMetrics,
  deriveMetricBand,
  runStrictlySerial,
  summarizeDiagnostics,
  type CaptureCell,
  type PixelBuffer,
} from '@/scripts/perf/visual-scorecard'

function pixels(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => readonly [number, number, number],
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = colorAt(x, y)
      const offset = (y * width + x) * 4
      data[offset] = red
      data[offset + 1] = green
      data[offset + 2] = blue
      data[offset + 3] = 255
    }
  }
  return { width, height, data }
}

describe('Phase 4 scorecard golden metrics', () => {
  it('pins a flat-color 5x5 image', () => {
    expect(
      computeVisualMetrics(pixels(5, 5, () => [64, 64, 64])),
    ).toEqual({
      entropy: 0,
      edgeDensity: 0,
      luminanceContrast: 0,
      dominantShare: 1,
      distinctColors: 1,
      nonBackgroundFraction: 0,
    })
  })

  it('pins an 8x8 black/white checkerboard', () => {
    const result = computeVisualMetrics(
      pixels(8, 8, (x, y) =>
        (x + y) % 2 === 0 ? [0, 0, 0] : [255, 255, 255],
      ),
    )
    expect(result.entropy).toBe(1)
    expect(result.dominantShare).toBe(0.5)
    expect(result.luminanceContrast).toBeCloseTo(0.5, 12)
    expect(result.edgeDensity).toBe(0)
    expect(result.distinctColors).toBe(2)
    expect(result.nonBackgroundFraction).toBe(0.5)
  })

  it('pins an 8x8 horizontal step edge', () => {
    const result = computeVisualMetrics(
      pixels(8, 8, (_x, y) =>
        y < 4 ? [0, 0, 0] : [255, 255, 255],
      ),
    )
    expect(result.entropy).toBe(1)
    expect(result.dominantShare).toBe(0.5)
    expect(result.luminanceContrast).toBeCloseTo(0.5, 12)
    expect(result.edgeDensity).toBeCloseTo(1 / 3, 12)
  })

  it('pins an 8x8 two-color 75/25 split', () => {
    const result = computeVisualMetrics(
      pixels(8, 8, (_x, y) =>
        y < 6 ? [0, 0, 0] : [255, 255, 255],
      ),
    )
    expect(result.entropy).toBeCloseTo(0.8112781244591328, 12)
    expect(result.dominantShare).toBe(0.75)
    expect(result.luminanceContrast).toBeCloseTo(Math.sqrt(3 / 16), 12)
    expect(result.edgeDensity).toBeCloseTo(1 / 3, 12)
    expect(result.nonBackgroundFraction).toBe(0.25)
  })

  it('pins the sub-3x3 zero-interior edge rule', () => {
    const result = computeVisualMetrics(
      pixels(2, 2, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255])),
    )
    expect(result.edgeDensity).toBe(0)
  })
})

describe('Phase 4 scorecard evidence protections', () => {
  it('derives the approved floor-or-repeat bands', () => {
    const entropy = deriveMetricBand('entropy', [4, 4.1, 4.2])
    expect(entropy[0]).toBeCloseTo(3.75, 12)
    expect(entropy[1]).toBeCloseTo(4.45, 12)
    const edge = deriveMetricBand('edgeDensity', [0.1, 0.1, 0.1])
    expect(edge[0]).toBeCloseTo(0.08, 12)
    expect(edge[1]).toBeCloseTo(0.12, 12)
    const contrast = deriveMetricBand(
      'luminanceContrast',
      [0.2, 0.2, 0.2],
    )
    expect(contrast[0]).toBeCloseTo(0.17, 12)
    expect(contrast[1]).toBeCloseTo(0.23, 12)
    const dominant = deriveMetricBand(
      'dominantShare',
      [0.5, 0.5, 0.5],
    )
    expect(dominant[0]).toBeCloseTo(0.44, 12)
    expect(dominant[1]).toBeCloseTo(0.56, 12)
  })

  it('rejects dirty trees and renderer substitutions', () => {
    expect(() => assertCleanGitStatus('')).not.toThrow()
    expect(() => assertCleanGitStatus(' M file.ts')).toThrow(/clean git worktree/)

    const swiftShader = {
      unmaskedVendor: 'Google Inc.',
      unmaskedRenderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))',
      classification: 'software' as const,
    }
    expect(() =>
      assertRendererAllowed('software', swiftShader),
    ).not.toThrow()
    expect(() =>
      assertRendererAllowed('hardware', swiftShader),
    ).toThrow(/Hardware scorecard/)
    expect(() =>
      assertRendererAllowed('software', {
        ...swiftShader,
        unmaskedRenderer: 'llvmpipe',
      }),
    ).toThrow(/require SwiftShader exactly/)
    expect(() =>
      assertRendererAllowed(
        'software',
        swiftShader,
        { ...swiftShader, unmaskedRenderer: 'Other SwiftShader identity' },
      ),
    ).toThrow(/Cross-backend comparison refused/)
    expect(() =>
      assertRendererAllowed('hardware', {
        unmaskedVendor: '',
        unmaskedRenderer: 'Apple M-series',
        classification: 'hardware',
      }),
    ).toThrow(/usable unmaskedVendor identity/)
  })

  it('allows only the two observed exact warning patterns and fails closed', () => {
    expect(
      SCORECARD_DIAGNOSTIC_ALLOWLIST.map(
        ({ id, reason, reviewDate }) => ({ id, reason, reviewDate }),
      ),
    ).toEqual([
      {
        id: 'swiftshader-readpixels-stall',
        reason:
          'Observed on the 2026-08-07 forced-SwiftShader capture when the scorecard intentionally reads the rendered buffer for measurement.',
        reviewDate: '2026-08-07',
      },
      {
        id: 'three-clock-deprecated',
        reason:
          'Observed on the 2026-08-07 capture from the two existing scene clocks; migrating those clocks is outside the Phase 4 evidence step.',
        reviewDate: '2026-08-07',
      },
      {
        id: 'vercel-analytics-dev-orb',
        reason:
          'Observed on the 2026-08-07 local capture when the development-only Vercel Analytics script was blocked by Chromium ORB after 32 successful repeats.',
        reviewDate: '2026-08-07',
      },
    ])
    expect(summarizeDiagnostics([])).toEqual({
      unexpectedErrors: 0,
      allowlistMatches: {
        'swiftshader-readpixels-stall': 0,
        'three-clock-deprecated': 0,
        'vercel-analytics-dev-orb': 0,
      },
    })
    expect(
      summarizeDiagnostics([
        {
          kind: 'console.warning',
          text:
            '[.WebGL-0x104004cf000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels',
        },
        {
          kind: 'console.warning',
          text:
            'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
        },
        {
          kind: 'console.warning',
          text:
            'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
        },
        {
          kind: 'requestfailed',
          text:
            'net::ERR_BLOCKED_BY_ORB https://va.vercel-scripts.com/v1/script.debug.js',
        },
      ]),
    ).toEqual({
      unexpectedErrors: 0,
      allowlistMatches: {
        'swiftshader-readpixels-stall': 1,
        'three-clock-deprecated': 2,
        'vercel-analytics-dev-orb': 1,
      },
    })

    expect(() =>
      summarizeDiagnostics([
        {
          kind: 'console.warning',
          text:
            '[.WebGL-104004cf000]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels',
        },
      ]),
    ).toThrow('console.warning: [.WebGL-104004cf000]')
    expect(() =>
      summarizeDiagnostics([
        {
          kind: 'console.warning',
          text:
            'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead!',
        },
      ]),
    ).toThrow('Please use THREE.Timer instead!')
    for (const nearMiss of [
      'net::ERR_BLOCKED_BY_ORB https://va.vercel-scripts.com/v1/script.debug.js?retry=1',
      'net::ERR_BLOCKED_BY_ORB https://va.vercel-scripts.example.com/v1/script.debug.js',
      'net::ERR_FAILED https://va.vercel-scripts.com/v1/script.debug.js',
    ]) {
      expect(() =>
        summarizeDiagnostics([
          {
            kind: 'requestfailed',
            text: nearMiss,
          },
        ]),
      ).toThrow(`requestfailed: ${nearMiss}`)
    }

    for (const kind of [
      'console.error',
      'console.warning',
      'pageerror',
      'requestfailed',
      'http',
    ] as const) {
      expect(() =>
        summarizeDiagnostics([{ kind, text: 'fixture failure' }]),
      ).toThrow(`${kind}: fixture failure`)
    }
  })

  it('compares matching cells against backend-specific metric bands', () => {
    const baseline = {
      viewport: { id: 'reference-normal', w: 1440, h: 900 },
      view: 'deck',
      dpr: 2,
      theme: 'dark',
      repeats: [],
      median: {
        entropy: 1,
        edgeDensity: 0.1,
        luminanceContrast: 0.2,
        dominantShare: 0.5,
      },
      band: {
        entropy: [0.5, 1.5],
        edgeDensity: [0.05, 0.15],
        luminanceContrast: [0.1, 0.3],
        dominantShare: [0.4, 0.6],
      },
      diagnostics: { unexpectedErrors: 0, allowlistMatches: {} },
    } as const satisfies CaptureCell
    expect(() =>
      assertScorecardWithinBaseline([baseline], [baseline]),
    ).not.toThrow()
    expect(() =>
      assertScorecardWithinBaseline(
        [
          {
            ...baseline,
            median: { ...baseline.median, entropy: 1.6 },
          },
        ],
        [baseline],
      ),
    ).toThrow(/outside baseline band/)
    expect(() =>
      assertScorecardWithinBaseline([baseline], []),
    ).toThrow(/matrix mismatch/)
  })

  it('runs work serially and keeps the canonical matrix at 24x3', async () => {
    let active = 0
    let maxActive = 0
    const order: number[] = []
    const result = await runStrictlySerial([0, 1, 2], async (value) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      order.push(value)
      active -= 1
      return value * 2
    })
    expect(maxActive).toBe(1)
    expect(order).toEqual([0, 1, 2])
    expect(result).toEqual([0, 2, 4])
    expect(
      SCORECARD_VIEWPORTS.length *
        SCORECARD_VIEWS.length *
        SCORECARD_DPRS.length *
        SCORECARD_THEMES.length,
    ).toBe(24)
    expect(SCORECARD_REPEATS).toBe(3)
  })
})
