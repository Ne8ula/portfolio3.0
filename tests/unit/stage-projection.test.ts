import { describe, expect, it } from 'vitest'

import { contains, intersects } from '@/lib/responsive/geometry'
import type {
  ProjectionSample,
  StageProjectionContext,
} from '@/lib/responsive/stage-projection'
import {
  isValidProjectionSample,
  projectPointToStage,
  projectQuadToStage,
  projectRectToStage,
} from '@/lib/responsive/stage-projection'

const sample = (
  ndcX: number,
  ndcY: number,
  overrides: Partial<ProjectionSample> = {},
): ProjectionSample => ({
  ndcX,
  ndcY,
  ndcZ: 0,
  viewZ: -1,
  ...overrides,
})

const context = (
  overrides: Partial<StageProjectionContext> = {},
): StageProjectionContext => ({
  canvasRect: { x: 130, y: 90, w: 200, h: 100 },
  stageRect: { x: 100, y: 50, w: 400, h: 300 },
  stageClientLeft: 5,
  stageClientTop: 7,
  cameraNear: 0.1,
  sourceFrameId: 42,
  ...overrides,
})

describe('stage-relative projection', () => {
  it('converts NDC through the canvas offset and stage padding-box origin exactly', () => {
    expect(projectPointToStage(sample(-1, 1), context())).toEqual({ x: 25, y: 33 })
    expect(projectPointToStage(sample(0, 0), context())).toEqual({ x: 125, y: 83 })
    expect(projectPointToStage(sample(1, -1), context())).toEqual({ x: 225, y: 133 })
  })

  it('builds a raw rect and oriented quad with source-frame provenance', () => {
    const ctx = context()
    const rect = projectRectToStage([sample(-1, 1), sample(1, -1)], ctx)
    const quad = projectQuadToStage(
      {
        tl: sample(-1, 1),
        tr: sample(1, 1),
        bl: sample(-1, -1),
        br: sample(1, -1),
      },
      ctx,
    )

    expect(rect).toEqual({
      x: 25,
      y: 33,
      w: 200,
      h: 100,
      visible: true,
      sourceFrameId: 42,
    })
    expect(quad).toEqual({
      corners: {
        tl: { x: 25, y: 33 },
        tr: { x: 225, y: 33 },
        bl: { x: 25, y: 133 },
        br: { x: 225, y: 133 },
      },
      bounds: { x: 25, y: 33, w: 200, h: 100 },
      visible: true,
      sourceFrameId: 42,
    })
  })

  it('returns off-stage geometry raw and unclamped with visible false', () => {
    const offStage = context({
      canvasRect: { x: -500, y: 100, w: 100, h: 100 },
      stageRect: { x: 0, y: 0, w: 400, h: 300 },
      stageClientLeft: 0,
      stageClientTop: 0,
    })
    const rect = projectRectToStage([sample(-1, 1), sample(1, -1)], offStage)

    expect(rect).toEqual({
      x: -500,
      y: 100,
      w: 100,
      h: 100,
      visible: false,
      sourceFrameId: 42,
    })
  })

  it('treats an exact stage-edge touch as not visible', () => {
    const touching = context({
      canvasRect: { x: 400, y: 40, w: 100, h: 100 },
      stageRect: { x: 0, y: 0, w: 400, h: 300 },
      stageClientLeft: 0,
      stageClientTop: 0,
    })

    expect(projectRectToStage([sample(-1, 1), sample(1, -1)], touching)).toMatchObject({
      x: 400,
      visible: false,
    })
  })
})

describe('projection validity', () => {
  it('uses the caller near plane and rejects equality', () => {
    expect(isValidProjectionSample(sample(0, 0, { viewZ: -0.1 }), 0.1)).toBe(false)
    expect(isValidProjectionSample(sample(0, 0, { viewZ: -0.075 }), 0.1)).toBe(false)
    expect(isValidProjectionSample(sample(0, 0, { viewZ: -0.100_001 }), 0.1)).toBe(
      true,
    )
  })

  it('rejects beyond-far and non-finite samples', () => {
    expect(isValidProjectionSample(sample(0, 0, { ndcZ: 1 }), 0.1)).toBe(true)
    expect(isValidProjectionSample(sample(0, 0, { ndcZ: 1.000_001 }), 0.1)).toBe(
      false,
    )

    for (const invalid of [
      sample(Number.NaN, 0),
      sample(0, Number.POSITIVE_INFINITY),
      sample(0, 0, { ndcZ: Number.NEGATIVE_INFINITY }),
      sample(0, 0, { viewZ: Number.NaN }),
    ]) {
      expect(isValidProjectionSample(invalid, 0.1)).toBe(false)
    }
  })

  it('requires positive finite camera and measurement dimensions', () => {
    expect(projectPointToStage(sample(0, 0), context({ cameraNear: 0 }))).toBeNull()
    expect(
      projectPointToStage(sample(0, 0), context({ cameraNear: Number.NaN })),
    ).toBeNull()

    for (const canvasRect of [
      { x: 0, y: 0, w: 0, h: 100 },
      { x: 0, y: 0, w: 100, h: 0 },
      { x: 0, y: 0, w: Number.NaN, h: 100 },
    ]) {
      expect(projectPointToStage(sample(0, 0), context({ canvasRect }))).toBeNull()
    }

    for (const stageRect of [
      { x: 0, y: 0, w: 0, h: 100 },
      { x: 0, y: 0, w: 100, h: 0 },
      { x: 0, y: 0, w: 100, h: Number.POSITIVE_INFINITY },
    ]) {
      expect(projectPointToStage(sample(0, 0), context({ stageRect }))).toBeNull()
    }
  })

  it('requires every defining point to pass and rejects degenerate bounds', () => {
    expect(
      projectRectToStage(
        [sample(-1, -1), sample(1, 1, { viewZ: -0.05 })],
        context(),
      ),
    ).toBeNull()
    expect(projectRectToStage([sample(0, -1), sample(0, 1)], context())).toBeNull()
    expect(projectRectToStage([sample(-1, 0), sample(1, 0)], context())).toBeNull()
  })

  it('rejects non-finite padding offsets and frame identifiers', () => {
    expect(
      projectPointToStage(sample(0, 0), context({ stageClientLeft: Number.NaN })),
    ).toBeNull()
    expect(
      projectRectToStage(
        [sample(-1, 1), sample(1, -1)],
        context({ sourceFrameId: Number.POSITIVE_INFINITY }),
      ),
    ).toBeNull()
  })
})

describe('geometry inclusivity contract', () => {
  it('keeps contains inclusive and intersects edge-exclusive', () => {
    const outer = { x: 0, y: 0, w: 100, h: 100 }
    expect(contains(outer, { ...outer })).toBe(true)
    expect(intersects(outer, { x: 100, y: 0, w: 10, h: 10 })).toBe(false)
    expect(intersects(outer, { x: 99.999, y: 0, w: 10, h: 10 })).toBe(true)
  })
})
