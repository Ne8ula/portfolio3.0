import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRandomSource } from '@/lib/random/seeded-streams'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('seeded named streams', () => {
  it('pins the xmur3+sfc32 known-answer sequence', () => {
    const stream = createRandomSource('phase-4').stream('starfield')

    expect(Array.from({ length: 8 }, () => stream.next())).toEqual([
      0.48636834463104606, 0.29073489224538207, 0.9392333151772618,
      0.40267748362384737, 0.7352380489464849, 0.2727974131703377,
      0.932713681133464, 0.3663370874710381,
    ])
  })

  it('pins a second seed/name vector and the [0, 1) range', () => {
    const stream = createRandomSource('ax-cockpit-phase4-v1').stream(
      'textures/coffee',
    )
    const values = Array.from({ length: 8 }, () => stream.next())

    expect(values).toEqual([
      0.27684691338799894, 0.5548736029304564, 0.866123458603397,
      0.9828651680145413, 0.5023526924196631, 0.26245405594818294,
      0.11590164806693792, 0.45132428547367454,
    ])
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it('memoizes streams by name and continues their sequence', () => {
    const source = createRandomSource('memo')
    const first = source.stream('a')
    const firstValue = first.next()
    const same = source.stream('a')

    expect(source.seeded).toBe(true)
    expect(same).toBe(first)
    expect(same.next()).not.toBe(firstValue)
  })

  it('keeps named streams independent of other streams call counts', () => {
    const left = createRandomSource('independent')
    const right = createRandomSource('independent')

    left.stream('busy').next()
    left.stream('busy').next()
    left.stream('busy').next()

    expect(left.stream('quiet').next()).toBe(right.stream('quiet').next())
    expect(left.stream('quiet').next()).toBe(right.stream('quiet').next())
  })

  it('rejects U+0000 in both the seed and stream name', () => {
    expect(() => createRandomSource('bad\u0000seed')).toThrow(/U\+0000/)
    expect(() => createRandomSource('ok').stream('bad\u0000name')).toThrow(
      /U\+0000/,
    )
  })

  it('writes the separator textually in source with no raw NUL byte', () => {
    const source = readFileSync('lib/random/seeded-streams.ts')
    expect(source.includes(0)).toBe(false)
    expect(source.toString('utf8')).toContain("'\\u0000'")
  })
})

describe('production-shaped unseeded source', () => {
  it('memoizes named delegates while calling Math.random for every draw', () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0.125).mockReturnValueOnce(0.875)
    const delegatedRandom = Math.random

    const source = createRandomSource(null)
    const stream = source.stream('natural')

    expect(source.seeded).toBe(false)
    expect(Math.random).toBe(delegatedRandom)
    expect(source.stream('natural')).toBe(stream)
    expect(stream.next()).toBe(0.125)
    expect(stream.next()).toBe(0.875)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('never replaces the global random function when seeded', () => {
    const originalRandom = Math.random
    const source = createRandomSource('deterministic')

    source.stream('one').next()
    expect(Math.random).toBe(originalRandom)
  })
})
