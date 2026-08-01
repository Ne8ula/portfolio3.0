import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRendererSizeSync } from '@/components/cockpit/renderer-size-sync'
import {
  DPR_CAP,
  computeRenderSizeTarget,
  renderSizeTargetsEqual,
} from '@/lib/responsive/render-policy'
import type { RenderSizeInput, RenderSizeTarget } from '@/lib/responsive/render-policy'

function target(input: Partial<RenderSizeInput> = {}): RenderSizeTarget | null {
  return computeRenderSizeTarget({
    cssWidth: input.cssWidth ?? 100,
    cssHeight: input.cssHeight ?? 50,
    devicePixelRatio: input.devicePixelRatio ?? 1,
  })
}

describe('computeRenderSizeTarget', () => {
  it('pins the shared DPR cap', () => {
    expect(DPR_CAP).toBe(2)
  })

  it.each([
    ['zero width', { cssWidth: 0 }],
    ['negative width', { cssWidth: -1 }],
    ['NaN width', { cssWidth: Number.NaN }],
    ['infinite width', { cssWidth: Number.POSITIVE_INFINITY }],
    ['zero height', { cssHeight: 0 }],
    ['negative height', { cssHeight: -1 }],
    ['NaN height', { cssHeight: Number.NaN }],
    ['infinite height', { cssHeight: Number.NEGATIVE_INFINITY }],
  ])('rejects %s', (_label, input) => {
    expect(target(input)).toBeNull()
  })

  it.each([
    [0.5, 0.5],
    [1, 1],
    [2, 2],
    [3, 2],
  ])('maps DPR %s to %s', (devicePixelRatio, expected) => {
    expect(target({ devicePixelRatio })?.dpr).toBe(expected)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1, undefined])(
    'degrades invalid DPR %s to 1',
    (devicePixelRatio) => {
      expect(
        computeRenderSizeTarget({
          cssWidth: 100,
          cssHeight: 50,
          devicePixelRatio: devicePixelRatio as number,
        })?.dpr,
      ).toBe(1)
    },
  )

  it('keeps fractional CSS geometry and floors only buffer dimensions', () => {
    expect(
      target({
        cssWidth: 123.75,
        cssHeight: 45.625,
        devicePixelRatio: 1.5,
      }),
    ).toEqual({
      cssWidth: 123.75,
      cssHeight: 45.625,
      dpr: 1.5,
      bufferWidth: 185,
      bufferHeight: 68,
    })
  })

  it('keeps each valid buffer dimension at least one pixel', () => {
    expect(
      target({
        cssWidth: 0.25,
        cssHeight: 0.125,
        devicePixelRatio: 0.5,
      }),
    ).toMatchObject({
      bufferWidth: 1,
      bufferHeight: 1,
    })
  })

  it('supports an explicit positive cap and guards an invalid cap', () => {
    const input = { cssWidth: 100, cssHeight: 50, devicePixelRatio: 2 }
    expect(computeRenderSizeTarget(input, 1.25)?.dpr).toBe(1.25)
    expect(computeRenderSizeTarget(input, 0)?.dpr).toBe(DPR_CAP)
    expect(computeRenderSizeTarget(input, Number.NaN)?.dpr).toBe(DPR_CAP)
  })
})

describe('createRendererSizeSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies in order, versions once per target, re-arms DPR, and disposes every trigger', () => {
    class FakeMediaQueryList {
      readonly listeners = new Set<EventListenerOrEventListenerObject>()

      constructor(readonly media: string) {}

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type === 'change') this.listeners.add(listener)
      }

      removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type === 'change') this.listeners.delete(listener)
      }

      dispatchChange(): void {
        const event = new Event('change')
        for (const listener of this.listeners) {
          if (typeof listener === 'function') listener(event)
          else listener.handleEvent(event)
        }
      }
    }

    let observerDisconnected = false
    let observedBox: ResizeObserverBoxOptions | undefined
    class FakeResizeObserver {
      constructor(readonly callback: ResizeObserverCallback) {}

      observe(_target: Element, options?: ResizeObserverOptions): void {
        observedBox = options?.box
      }

      unobserve(): void {}

      disconnect(): void {
        observerDisconnected = true
      }
    }

    const queries: FakeMediaQueryList[] = []
    const fakeWindow = Object.assign(new EventTarget(), {
      devicePixelRatio: 1,
      matchMedia: vi.fn((query: string) => {
        const mediaQuery = new FakeMediaQueryList(query)
        queries.push(mediaQuery)
        return mediaQuery as unknown as MediaQueryList
      }),
    })
    vi.stubGlobal('window', fakeWindow)
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)

    const order: string[] = []
    const versions: number[] = []
    const camera = {
      aspect: 1,
      updateProjectionMatrix: vi.fn(() => order.push('projection')),
    }
    const renderer = {
      setPixelRatio: vi.fn(() => order.push('pixel-ratio')),
      setSize: vi.fn(() => order.push('size')),
    }
    const mount = {
      getBoundingClientRect: () => ({ width: 100.5, height: 50.25 }),
    } as unknown as HTMLElement

    const controller = createRendererSizeSync({
      mount,
      renderer,
      camera,
      onApplied: (_target, sizeVersion) => {
        versions.push(sizeVersion)
        order.push('render')
      },
    })

    expect(observedBox).toBe('border-box')
    expect(queries.map((query) => query.media)).toEqual(['(resolution: 1dppx)'])

    controller.sync()
    expect(order).toEqual(['projection', 'pixel-ratio', 'size', 'render'])
    expect(camera.aspect).toBe(2)
    expect(renderer.setSize).toHaveBeenLastCalledWith(100.5, 50.25, false)
    expect(versions).toEqual([1])

    order.length = 0
    for (let index = 0; index < 20; index += 1) {
      fakeWindow.dispatchEvent(new Event('resize'))
    }
    expect(order).toEqual([])
    expect(versions).toEqual([1])

    fakeWindow.devicePixelRatio = 2
    queries[0]!.dispatchChange()
    expect(order).toEqual(['pixel-ratio', 'size', 'render'])
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1)
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(2)
    expect(versions).toEqual([1, 2])
    expect(queries.map((query) => query.media)).toEqual([
      '(resolution: 1dppx)',
      '(resolution: 2dppx)',
    ])
    expect(queries[0]!.listeners.size).toBe(0)
    expect(queries[1]!.listeners.size).toBe(1)

    controller.dispose()
    controller.dispose()
    expect(observerDisconnected).toBe(true)
    expect(queries[1]!.listeners.size).toBe(0)

    fakeWindow.devicePixelRatio = 1
    fakeWindow.dispatchEvent(new Event('resize'))
    queries[1]!.dispatchChange()
    controller.sync()
    expect(versions).toEqual([1, 2])
  })
})

describe('renderSizeTargetsEqual', () => {
  const baseline: RenderSizeTarget = {
    cssWidth: 100.5,
    cssHeight: 50.25,
    dpr: 2,
    bufferWidth: 201,
    bufferHeight: 100,
  }

  it('treats two null targets as equal and one null target as changed', () => {
    expect(renderSizeTargetsEqual(null, null)).toBe(true)
    expect(renderSizeTargetsEqual(baseline, null)).toBe(false)
    expect(renderSizeTargetsEqual(null, baseline)).toBe(false)
  })

  it('accepts a distinct target with all five fields unchanged', () => {
    expect(renderSizeTargetsEqual(baseline, { ...baseline })).toBe(true)
  })

  it.each<keyof RenderSizeTarget>([
    'cssWidth',
    'cssHeight',
    'dpr',
    'bufferWidth',
    'bufferHeight',
  ])('rejects a change to %s', (field) => {
    expect(
      renderSizeTargetsEqual(baseline, {
        ...baseline,
        [field]: baseline[field] + 1,
      }),
    ).toBe(false)
  })
})
