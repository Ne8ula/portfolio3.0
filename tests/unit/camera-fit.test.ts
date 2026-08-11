import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js'

import {
  GLASS_MAC_FOCUS_AUTHORING,
  GLASS_MAC_FOCUS_POINTS_LOCAL,
} from '@/components/cockpit/glass-mac'
import {
  TURNTABLE_FOCUS_AUTHORING,
  TURNTABLE_FOCUS_POINTS_LOCAL,
} from '@/components/cockpit/turntable'
import {
  VINYL_CRATE_FOCUS_AUTHORING,
  VINYL_CRATE_FOCUS_POINTS_LOCAL,
} from '@/components/cockpit/vinyl-crate'
import {
  projectFitPoint,
  safeFrameToNdcBounds,
  solveCameraFit,
  type FitCameraInput,
} from '@/lib/responsive/camera-fit'
import { REQUIRED_VIEWPORT_CASES } from '@/lib/responsive/layout-contract'
import {
  FOCUS_CAMERA_DISTANCE_BOUNDS,
  FOCUS_CAMERA_RESERVATIONS,
  FOCUS_FALLBACK_DISTANCE,
  FIT_NDC_MARGIN,
  computeSafeFrame,
  type FocusKind,
} from '@/lib/responsive/hud-layout'
import { projectPointToStage } from '@/lib/responsive/stage-projection'

type Point3 = { readonly x: number; readonly y: number; readonly z: number }

function at<T>(values: readonly T[], index: number): T {
  const value = values[index]
  if (value === undefined) throw new Error(`Missing fixture point ${index}`)
  return value
}

const asVector = (point: Point3): THREE.Vector3 =>
  new THREE.Vector3(point.x, point.y, point.z)

const octagonFixture = (
  centerX: number,
  y: number,
  centerZ: number,
  radius: number,
): readonly Point3[] => {
  const vertexRadius = radius / Math.cos(Math.PI / 8)
  return Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + index * Math.PI / 4
    return {
      x: centerX + Math.cos(angle) * vertexRadius,
      y,
      z: centerZ + Math.sin(angle) * vertexRadius,
    }
  })
}

const tiltedDiscFixture = (tilt: number): readonly Point3[] => {
  const authoring = VINYL_CRATE_FOCUS_AUTHORING
  const vertexRadius = (authoring.disc.radius + authoring.disc.padding) /
    Math.cos(Math.PI / 8)
  const cosTilt = Math.cos(tilt)
  const sinTilt = Math.sin(tilt)

  return Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + index * Math.PI / 4
    const planeY = authoring.disc.previewRise + Math.sin(angle) * vertexRadius
    return {
      x: Math.cos(angle) * vertexRadius,
      y: authoring.pulledSleeve.baseY + cosTilt * planeY,
      z: authoring.pulledSleeve.baseZ + sinTilt * planeY,
    }
  })
}

function expectPointSetClose(
  actual: readonly Point3[],
  expected: readonly Point3[],
): void {
  expect(actual).toHaveLength(expected.length)
  for (let index = 0; index < expected.length; index += 1) {
    const actualPoint = at(actual, index)
    const expectedPoint = at(expected, index)
    expect(actualPoint.x, `point ${index} x`).toBeCloseTo(expectedPoint.x, 12)
    expect(actualPoint.y, `point ${index} y`).toBeCloseTo(expectedPoint.y, 12)
    expect(actualPoint.z, `point ${index} z`).toBeCloseTo(expectedPoint.z, 12)
  }
}

const authoredWorldMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(3.1, -0.7, 4.2),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0.17, -0.43, 0.09)),
  new THREE.Vector3(1.9, 1.9, 1.9),
)

const toAuthoredWorld = (point: Point3): THREE.Vector3 =>
  asVector(point).applyMatrix4(authoredWorldMatrix)

function convexPolygonContainsWorldPoint(
  point: THREE.Vector3,
  polygon: readonly Point3[],
): boolean {
  const worldPolygon = polygon.map(toAuthoredWorld)
  const worldNormal = new THREE.Vector3(0, 1, 0)
    .transformDirection(authoredWorldMatrix)
  let sawPositive = false
  let sawNegative = false
  for (let index = 0; index < worldPolygon.length; index += 1) {
    const start = at(worldPolygon, index)
    const end = at(worldPolygon, (index + 1) % worldPolygon.length)
    const signed = end.clone().sub(start)
      .cross(point.clone().sub(start))
      .dot(worldNormal)
    if (signed > 1e-9) sawPositive = true
    if (signed < -1e-9) sawNegative = true
  }
  return !(sawPositive && sawNegative)
}

function worldHeightAlongAuthoredY(point: THREE.Vector3): number {
  const origin = new THREE.Vector3(0, 0, 0).applyMatrix4(authoredWorldMatrix)
  const axis = new THREE.Vector3(0, 1, 0)
    .transformDirection(authoredWorldMatrix)
  return point.clone().sub(origin).dot(axis) / 1.9
}

const symmetricInput = (
  overrides: Partial<FitCameraInput> = {},
): FitCameraInput => ({
  center: { x: 0, y: 0, z: 0 },
  direction: { x: 0, y: 0, z: 1 },
  points: [
    { x: -1, y: -1, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: -1, y: 1, z: 0 },
    { x: 1, y: 1, z: 0 },
  ],
  fovYRad: Math.PI / 2,
  aspect: 1,
  near: 0.1,
  ndcBounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 },
  distance: { min: 0.2, max: 10 },
  maxIterations: 32,
  tolerance: 1e-8,
  ...overrides,
})

describe('focus-camera D6 tokens', () => {
  it('pins reservations, search bounds, and fallback distances', () => {
    expect(FOCUS_CAMERA_RESERVATIONS).toEqual({
      monitor: { top: 56, right: 44, bottom: 16, left: 16 },
      deck: { top: 56, right: 60, bottom: 72, left: 60 },
      crate: { top: 56, right: 60, bottom: 148, left: 60 },
    })
    expect(FOCUS_CAMERA_DISTANCE_BOUNDS).toEqual({
      monitor: { min: 1, max: 40 },
      deck: { min: 2, max: 60 },
      crate: { min: 1.5, max: 60 },
    })
    expect(FOCUS_FALLBACK_DISTANCE).toEqual({
      monitor: 1.7,
      deck: 3.8,
      crate: 3,
    })
    expect(FIT_NDC_MARGIN).toBe(0.04)
  })

  it('keeps every D6 reservation safe frame optical-center inclusive across FIT-MATRIX', () => {
    const kinds: readonly FocusKind[] = ['monitor', 'deck', 'crate']

    for (const viewport of REQUIRED_VIEWPORT_CASES) {
      const size = viewport.tier === 'zoom-narrow'
        ? { w: 1024, h: 600 }
        : { w: viewport.w, h: viewport.h }
      const stage = { x: 0, y: 0, ...size }

      for (const kind of kinds) {
        const safeFrame = computeSafeFrame(
          stage,
          FOCUS_CAMERA_RESERVATIONS[kind],
        )
        const bounds = safeFrameToNdcBounds(safeFrame, { x: 0, y: 0 }, size)

        expect(bounds, `${viewport.id}/${kind}`).not.toBeNull()
        expect(bounds?.minX, `${viewport.id}/${kind} minX`).toBeLessThanOrEqual(0)
        expect(bounds?.maxX, `${viewport.id}/${kind} maxX`).toBeGreaterThanOrEqual(0)
        expect(bounds?.minY, `${viewport.id}/${kind} minY`).toBeLessThanOrEqual(0)
        expect(bounds?.maxY, `${viewport.id}/${kind} maxY`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('AC-2 authored focus framing points', () => {
  it('pins the deck, crate, and monitor fixtures to the approved point sets', () => {
    expect(TURNTABLE_FOCUS_AUTHORING).toMatchObject({
      base: { width: 1.9, depth: 1.45, topY: 0.25 },
      platter: { centerX: -0.28, radius: 0.53, y: 0.342 },
      card: { bottomY: 0.938, topY: 2.2, sweptRadius: 0.47 },
      center: { x: -0.28, y: 1.1, z: 0 },
      verticalBias: 0.42,
    })
    expectPointSetClose(TURNTABLE_FOCUS_POINTS_LOCAL, [
      { x: -0.95, y: 0.25, z: -0.725 },
      { x: 0.95, y: 0.25, z: -0.725 },
      { x: -0.95, y: 0.25, z: 0.725 },
      { x: 0.95, y: 0.25, z: 0.725 },
      { x: -0.95, y: 0, z: 0.725 },
      { x: 0.95, y: 0, z: 0.725 },
      ...octagonFixture(-0.28, 0.342, 0, 0.53),
      ...octagonFixture(-0.28, 0.938, 0, 0.47),
      ...octagonFixture(-0.28, 2.2, 0, 0.47),
    ])

    expect(VINYL_CRATE_FOCUS_AUTHORING).toMatchObject({
      sleeve: {
        width: 0.95,
        height: 0.98,
        lift: 0.34,
        push: 0.04,
        lean: 0.1,
        tilt: 0.14,
      },
      shell: { topY: 1.063 },
      pulledSleeve: {
        topY: 1.54,
        topZ: 0.26,
        mouthY: 1,
        mouthZ: 0.3,
        baseY: 1,
        baseZ: 0.26,
      },
      disc: {
        padding: 0.01,
        previewRise: 0.52,
        minTilt: -0.1,
        maxTilt: 0.14,
      },
      center: { x: 0, y: 0.985, z: 0 },
      verticalBias: 1.8,
    })
    expect(VINYL_CRATE_FOCUS_AUTHORING.shell.halfWidth).toBeCloseTo(0.63, 12)
    expect(VINYL_CRATE_FOCUS_AUTHORING.shell.halfDepth).toBeCloseTo(0.4435, 12)
    expect(VINYL_CRATE_FOCUS_AUTHORING.disc.radius).toBeCloseTo(0.4508, 12)
    expectPointSetClose(VINYL_CRATE_FOCUS_POINTS_LOCAL, [
      { x: -0.63, y: 1.063, z: -0.4435 },
      { x: -0.63, y: 1.063, z: 0.4435 },
      { x: 0.63, y: 1.063, z: -0.4435 },
      { x: 0.63, y: 1.063, z: 0.4435 },
      { x: -0.63, y: 0, z: -0.4435 },
      { x: -0.63, y: 0, z: 0.4435 },
      { x: 0.63, y: 0, z: -0.4435 },
      { x: 0.63, y: 0, z: 0.4435 },
      { x: -0.475, y: 1.54, z: 0.26 },
      { x: 0.475, y: 1.54, z: 0.26 },
      { x: -0.475, y: 1, z: 0.3 },
      { x: 0.475, y: 1, z: 0.3 },
      ...tiltedDiscFixture(-0.1),
      ...tiltedDiscFixture(0.14),
    ])

    expect(GLASS_MAC_FOCUS_AUTHORING).toEqual({
      screen: { width: 1.78, height: 1.34, centerY: 0.1, z: 0.108 },
      verticalBias: 0,
    })
    expect(GLASS_MAC_FOCUS_POINTS_LOCAL).toEqual([
      { x: -0.89, y: 0.67, z: 0 },
      { x: 0.89, y: 0.67, z: 0 },
      { x: -0.89, y: -0.67, z: 0 },
      { x: 0.89, y: -0.67, z: 0 },
    ])
  })

  it('uses circumscribed octagons for the platter, card sweep, and crate disc planes', () => {
    const octagonScale = 1 / Math.cos(Math.PI / 8)
    const deckCases = [
      { points: TURNTABLE_FOCUS_POINTS_LOCAL.slice(6, 14), radius: 0.53 },
      { points: TURNTABLE_FOCUS_POINTS_LOCAL.slice(14, 22), radius: 0.47 },
      { points: TURNTABLE_FOCUS_POINTS_LOCAL.slice(22, 30), radius: 0.47 },
    ]
    for (const fixture of deckCases) {
      for (const point of fixture.points) {
        const radius = Math.hypot(
          point.x - TURNTABLE_FOCUS_AUTHORING.platter.centerX,
          point.z - TURNTABLE_FOCUS_AUTHORING.platter.centerZ,
        )
        expect(radius).toBeCloseTo(fixture.radius * octagonScale, 12)
      }
    }

    for (const [offset, tilt] of [
      [12, VINYL_CRATE_FOCUS_AUTHORING.disc.minTilt],
      [20, VINYL_CRATE_FOCUS_AUTHORING.disc.maxTilt],
    ] as const) {
      for (const point of VINYL_CRATE_FOCUS_POINTS_LOCAL.slice(offset, offset + 8)) {
        const translatedY = point.y - VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.baseY
        const translatedZ = point.z - VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.baseZ
        const planeY = Math.cos(tilt) * translatedY + Math.sin(tilt) * translatedZ
        const rimY = planeY - VINYL_CRATE_FOCUS_AUTHORING.disc.previewRise
        expect(Math.hypot(point.x, rimY)).toBeCloseTo(
          (VINYL_CRATE_FOCUS_AUTHORING.disc.radius +
            VINYL_CRATE_FOCUS_AUTHORING.disc.padding) * octagonScale,
          12,
        )
      }
    }
  })

  it('contains dense world-space deck card and platter sweeps without a camera', () => {
    const cardOctagon = TURNTABLE_FOCUS_POINTS_LOCAL.slice(14, 22)
    const platterOctagon = TURNTABLE_FOCUS_POINTS_LOCAL.slice(6, 14)
    const card = TURNTABLE_FOCUS_AUTHORING.card

    for (let yawIndex = 0; yawIndex < 64; yawIndex += 1) {
      const yaw = yawIndex * Math.PI * 2 / 64
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const scale = 0.9 + 0.1 * progress
        for (const bob of [-0.012, 0.012]) {
          const centerY = card.centerY + 0.06 * (1 - progress) + bob
          for (const xSign of [-1, 1]) {
            for (const ySign of [-1, 1]) {
              const point = {
                x: TURNTABLE_FOCUS_AUTHORING.platter.centerX +
                  Math.cos(yaw) * xSign * card.width * scale / 2,
                y: centerY + ySign * card.height * scale / 2,
                z: TURNTABLE_FOCUS_AUTHORING.platter.centerZ -
                  Math.sin(yaw) * xSign * card.width * scale / 2,
              }
              const worldPoint = toAuthoredWorld(point)
              expect(convexPolygonContainsWorldPoint(worldPoint, cardOctagon)).toBe(true)
              const height = worldHeightAlongAuthoredY(worldPoint)
              expect(height).toBeGreaterThanOrEqual(card.bottomY - 1e-9)
              expect(height).toBeLessThanOrEqual(card.topY + 1e-9)
            }
          }
        }
      }
    }

    for (let index = 0; index < 128; index += 1) {
      const angle = index * Math.PI * 2 / 128
      const worldPoint = toAuthoredWorld({
        x: TURNTABLE_FOCUS_AUTHORING.platter.centerX + Math.cos(angle) * 0.53,
        y: TURNTABLE_FOCUS_AUTHORING.platter.y,
        z: TURNTABLE_FOCUS_AUTHORING.platter.centerZ + Math.sin(angle) * 0.53,
      })
      expect(convexPolygonContainsWorldPoint(worldPoint, platterOctagon)).toBe(true)
    }

    const inscribedDiamond = [
      { x: -0.28 + 0.47, y: card.bottomY, z: 0 },
      { x: -0.28, y: card.bottomY, z: 0.47 },
      { x: -0.28 - 0.47, y: card.bottomY, z: 0 },
      { x: -0.28, y: card.bottomY, z: -0.47 },
    ]
    const diagonalCardExtent = toAuthoredWorld({
      x: -0.28 + Math.cos(Math.PI / 4) * 0.47,
      y: card.bottomY,
      z: -Math.sin(Math.PI / 4) * 0.47,
    })
    expect(convexPolygonContainsWorldPoint(diagonalCardExtent, inscribedDiamond)).toBe(false)
  })

  it('contains the dense joint crate rise/tilt rim sweep in its world-space convex hull', () => {
    const hull = new ConvexHull().setFromPoints(
      VINYL_CRATE_FOCUS_POINTS_LOCAL.map(toAuthoredWorld),
    )
    const fixture = VINYL_CRATE_FOCUS_AUTHORING

    for (let riseIndex = 0; riseIndex <= 16; riseIndex += 1) {
      const rise = fixture.disc.previewRise * riseIndex / 16
      for (let tiltIndex = 0; tiltIndex <= 16; tiltIndex += 1) {
        const tilt = fixture.disc.minTilt +
          (fixture.disc.maxTilt - fixture.disc.minTilt) * tiltIndex / 16
        const cosTilt = Math.cos(tilt)
        const sinTilt = Math.sin(tilt)
        for (let rimIndex = 0; rimIndex < 64; rimIndex += 1) {
          const angle = rimIndex * Math.PI * 2 / 64
          const planeY = rise + Math.sin(angle) * fixture.disc.radius
          const worldPoint = toAuthoredWorld({
            x: Math.cos(angle) * fixture.disc.radius,
            y: fixture.pulledSleeve.baseY + cosTilt * planeY,
            z: fixture.pulledSleeve.baseZ + sinTilt * planeY,
          })
          expect(hull.containsPoint(worldPoint)).toBe(true)
        }
      }
    }
  })

  it('keeps crate motion constants shared with the sleeve probe contract', () => {
    const fixture = VINYL_CRATE_FOCUS_AUTHORING
    expect(fixture.disc.radius).toBeCloseTo(fixture.sleeve.height * 0.46, 12)
    expect(fixture.disc.previewRise).toBe(0.52)
    expect(fixture.disc.clearRise).toBeCloseTo(
      fixture.sleeve.height / 2 + fixture.disc.radius + fixture.disc.clearance,
      12,
    )
  })
})

describe('safeFrameToNdcBounds', () => {
  it('round-trips the §3.3 asymmetric bounds through projectPointToStage', () => {
    const safeFrame = { x: 40, y: 30, w: 200, h: 100 }
    const canvasOffset = { x: 20, y: 10 }
    const canvasSize = { w: 400, h: 200 }
    const bounds = safeFrameToNdcBounds(safeFrame, canvasOffset, canvasSize)

    expect(bounds).not.toBeNull()
    if (bounds === null) return

    const context = {
      canvasRect: { x: 125, y: 67, ...canvasSize },
      stageRect: { x: 100, y: 50, w: 500, h: 300 },
      stageClientLeft: 5,
      stageClientTop: 7,
      cameraNear: 0.1,
      sourceFrameId: 1,
    }
    const projectedTopLeft = projectPointToStage(
      { ndcX: bounds.minX, ndcY: bounds.maxY, ndcZ: 0, viewZ: -1 },
      context,
    )
    const projectedBottomRight = projectPointToStage(
      { ndcX: bounds.maxX, ndcY: bounds.minY, ndcZ: 0, viewZ: -1 },
      context,
    )

    expect(projectedTopLeft?.x).toBeCloseTo(safeFrame.x, 9)
    expect(projectedTopLeft?.y).toBeCloseTo(safeFrame.y, 9)
    expect(projectedBottomRight?.x).toBeCloseTo(safeFrame.x + safeFrame.w, 9)
    expect(projectedBottomRight?.y).toBeCloseTo(safeFrame.y + safeFrame.h, 9)
  })

  it('rejects invalid safe-frame and canvas measurements', () => {
    expect(
      safeFrameToNdcBounds(
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 0, y: 0 },
        { w: 0, h: 100 },
      ),
    ).toBeNull()
    expect(
      safeFrameToNdcBounds(
        { x: Number.NaN, y: 0, w: 10, h: 10 },
        { x: 0, y: 0 },
        { w: 100, h: 100 },
      ),
    ).toBeNull()
  })
})

describe('solveCameraFit', () => {
  it('finds the smallest fitting distance within the iteration and tolerance contract', () => {
    const result = solveCameraFit(symmetricInput())

    expect(result.status).toBe('fit')
    if (result.status !== 'fit') return
    expect(result.distance).toBeCloseTo(1, 6)
    expect(result.iterations).toBeLessThanOrEqual(32)
  })

  it('uses the approved default of at most 16 iterations', () => {
    const result = solveCameraFit(
      symmetricInput({ maxIterations: undefined, tolerance: undefined }),
    )

    expect(result.status).toBe('fit')
    if (result.status !== 'fit') return
    const defaultTolerance = Math.max(1e-3, 5e-4 * 10)
    expect(result.iterations).toBeLessThanOrEqual(16)
    expect(result.distance).toBeGreaterThanOrEqual(1)
    expect(result.distance - 1).toBeLessThanOrEqual(defaultTolerance)
  })

  it('honors asymmetric bounds rather than fitting against the full viewport', () => {
    const symmetric = solveCameraFit(symmetricInput())
    const topReserved = solveCameraFit(
      symmetricInput({
        ndcBounds: { minX: -1, maxX: 1, minY: -1, maxY: 0.5 },
      }),
    )

    expect(symmetric.status).toBe('fit')
    expect(topReserved.status).toBe('fit')
    if (symmetric.status !== 'fit' || topReserved.status !== 'fit') return
    expect(symmetric.distance).toBeCloseTo(1, 6)
    expect(topReserved.distance).toBeCloseTo(2, 6)
    expect(topReserved.distance).toBeGreaterThan(symmetric.distance)
  })

  it('returns the minimum bound immediately when it already fits', () => {
    expect(
      solveCameraFit(symmetricInput({ distance: { min: 3, max: 10 } })),
    ).toEqual({ status: 'fit', distance: 3, iterations: 0 })
  })

  it('rejects points on or behind the near plane at a candidate distance', () => {
    const input = symmetricInput()
    expect(
      projectFitPoint(input, { x: 0, y: 0, z: 0.9 }, 1),
    ).toBeNull()
    expect(
      projectFitPoint(input, { x: 0, y: 0, z: 1.1 }, 1),
    ).toBeNull()
  })

  it('returns invalid-input for malformed data and center-excluding bounds', () => {
    const invalidInputs: readonly FitCameraInput[] = [
      symmetricInput({ points: [] }),
      symmetricInput({ points: [{ x: Number.NaN, y: 0, z: 0 }] }),
      symmetricInput({ center: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } }),
      symmetricInput({ direction: { x: 0, y: 0, z: 0 } }),
      symmetricInput({ aspect: 0 }),
      symmetricInput({ near: Number.NaN }),
      symmetricInput({ fovYRad: Math.PI }),
      symmetricInput({ ndcBounds: { minX: 1, maxX: -1, minY: -1, maxY: 1 } }),
      symmetricInput({ ndcBounds: { minX: 0.1, maxX: 1, minY: -1, maxY: 1 } }),
      symmetricInput({ ndcBounds: { minX: -1, maxX: 1, minY: -1, maxY: -0.1 } }),
      symmetricInput({ distance: { min: 10, max: 10 } }),
      symmetricInput({ maxIterations: 0 }),
      symmetricInput({ tolerance: 0 }),
    ]

    for (const input of invalidInputs) {
      expect(solveCameraFit(input)).toEqual({
        status: 'no-fit',
        reason: 'invalid-input',
      })
    }
  })

  it('returns unfittable-at-max without exposing a usable distance', () => {
    const result = solveCameraFit(
      symmetricInput({ distance: { min: 0.2, max: 0.5 } }),
    )

    expect(result).toEqual({ status: 'no-fit', reason: 'unfittable-at-max' })
    expect('distance' in result).toBe(false)
  })

  it('is deterministic across repeated calls and does not mutate input', () => {
    const input = symmetricInput({ maxIterations: 16, tolerance: 1e-6 })
    const before = JSON.stringify(input)
    const first = solveCameraFit(input)

    for (let index = 0; index < 100; index += 1) {
      expect(solveCameraFit(input)).toEqual(first)
    }
    expect(JSON.stringify(input)).toBe(before)
  })
})
