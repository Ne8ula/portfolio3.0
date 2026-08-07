import { beforeEach, describe, expect, it } from 'vitest'

import {
  computeHudFrame,
  getHudFrameForDiagnostics,
  getHudFrameMeta,
  getPublishedHudFrame,
  hudFramesEquivalent,
  isHudSamplerParked,
  nextHudFrameId,
  parkHudSampler,
  resetHudSampler,
  type HudProjectionSample,
  type HudSamplerComputeInput,
} from '@/components/cockpit/hud-sampler'

function sample(x: number, y: number): HudProjectionSample {
  return {
    ndcX: x / 50 - 1,
    ndcY: 1 - y / 50,
    ndcZ: 0,
    viewZ: -1,
  }
}

function rectSamples(x: number, y: number, w: number, h: number) {
  return [
    sample(x, y),
    sample(x + w, y),
    sample(x, y + h),
    sample(x + w, y + h),
  ]
}

function input(
  overrides: Partial<HudSamplerComputeInput> = {},
): HudSamplerComputeInput {
  return {
    frameId: nextHudFrameId(),
    sizeVersion: 1,
    nowMs: 0,
    mode: 'cockpit',
    stageRect: { x: 0, y: 0, w: 100, h: 100 },
    stageClientLeft: 0,
    stageClientTop: 0,
    canvasRect: { x: 0, y: 0, w: 100, h: 100 },
    cameraNear: 0.1,
    monitorSamples: null,
    deck: { info: null, cardSamples: null },
    crate: { rectSamples: null, selection: null },
    pcSamples: null,
    anchors: null,
    hoveredTag: null,
    ...overrides,
  }
}

describe('focused HUD sampler', () => {
  beforeEach(() => {
    resetHudSampler()
  })

  it('excludes frame/source ids from the epsilon publication gate', () => {
    const first = computeHudFrame(
      input({
        mode: 'cockpit',
        hoveredTag: 'pc',
        pcSamples: rectSamples(10, 20, 30, 40),
      }),
    )
    expect(getHudFrameMeta(0).publishCount).toBe(1)

    const second = computeHudFrame(
      input({
        mode: 'cockpit',
        hoveredTag: 'pc',
        pcSamples: rectSamples(10.2, 20, 30, 40),
      }),
    )

    expect(second.frameId).toBeGreaterThan(first.frameId)
    expect(second.pc?.sourceFrameId).toBe(second.frameId)
    expect(first.pc?.sourceFrameId).toBe(first.frameId)
    expect(hudFramesEquivalent(first, second)).toBe(true)
    expect(getHudFrameMeta(0)).toMatchObject({
      computeCount: 2,
      publishCount: 1,
    })
    expect(getPublishedHudFrame()).toBe(first)
  })

  it('publishes semantic changes even when geometry is unchanged', () => {
    const card = rectSamples(20, 20, 30, 40)
    computeHudFrame(
      input({
        mode: 'deck',
        deck: {
          info: { index: 0, count: 6, busy: false },
          cardSamples: card,
        },
      }),
    )
    computeHudFrame(
      input({
        mode: 'deck',
        deck: {
          info: { index: 0, count: 6, busy: true },
          cardSamples: card,
        },
      }),
    )
    expect(getHudFrameMeta(0).publishCount).toBe(2)
  })

  it('retains only a busy deck card for 350ms with honest provenance', () => {
    const live = computeHudFrame(
      input({
        nowMs: 5,
        mode: 'deck',
        deck: {
          info: { index: 0, count: 6, busy: false },
          cardSamples: rectSamples(20, 20, 30, 40),
        },
      }),
    )
    const sourceFrameId = live.deck.card?.sourceFrameId

    const retained = computeHudFrame(
      input({
        nowMs: 10,
        mode: 'deck',
        deck: {
          info: { index: 1, count: 6, busy: true },
          cardSamples: null,
        },
      }),
    )
    expect(retained.deck.card).toMatchObject({
      retained: true,
      sourceFrameId,
    })
    expect(retained.deck.card?.sourceFrameId).not.toBe(retained.frameId)
    expect(getHudFrameMeta(10).graceRemainingMs).toBe(350)

    const expired = computeHudFrame(
      input({
        nowMs: 360,
        mode: 'deck',
        deck: {
          info: { index: 1, count: 6, busy: true },
          cardSamples: null,
        },
      }),
    )
    expect(expired.deck.card).toBeNull()
    expect(getHudFrameMeta(360).graceRemainingMs).toBeNull()
  })

  it('clears retention immediately on mode exit or a non-busy invalid card', () => {
    const card = rectSamples(20, 20, 30, 40)
    computeHudFrame(
      input({
        mode: 'deck',
        deck: {
          info: { index: 0, count: 6, busy: false },
          cardSamples: card,
        },
      }),
    )
    computeHudFrame(
      input({
        nowMs: 10,
        mode: 'deck',
        deck: {
          info: { index: 1, count: 6, busy: true },
          cardSamples: null,
        },
      }),
    )
    expect(
      computeHudFrame(input({ nowMs: 11, mode: 'cockpit' })).deck.card,
    ).toBeNull()

    computeHudFrame(
      input({
        nowMs: 20,
        mode: 'deck',
        deck: {
          info: { index: 0, count: 6, busy: false },
          cardSamples: card,
        },
      }),
    )
    expect(
      computeHudFrame(
        input({
          nowMs: 21,
          mode: 'deck',
          deck: {
            info: { index: 0, count: 6, busy: false },
            cardSamples: null,
          },
        }),
      ).deck.card,
    ).toBeNull()
  })

  it('parks the last compute and clears it at rebuild without resetting frame ids', () => {
    const before = computeHudFrame(input())
    parkHudSampler()
    expect(isHudSamplerParked()).toBe(true)
    expect(getHudFrameForDiagnostics()).toBe(before)

    resetHudSampler()
    expect(isHudSamplerParked()).toBe(false)
    expect(getHudFrameForDiagnostics()).toBeNull()
    const after = computeHudFrame(input())
    expect(after.frameId).toBeGreaterThan(before.frameId)
  })
})
