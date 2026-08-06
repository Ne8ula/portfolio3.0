// Named random streams for deterministic visual capture. Production passes
// a null seed and delegates every draw to Math.random without patching it.

export type RandomStream = {
  next(): number
}

export type RandomSource = {
  readonly seeded: boolean
  stream(name: string): RandomStream
}

const UINT32_RANGE = 4_294_967_296
const STREAM_SEPARATOR = '\u0000'

function rejectSeparator(value: string, label: 'seed' | 'stream name'): void {
  if (value.includes(STREAM_SEPARATOR)) {
    throw new TypeError(`${label} must not contain U+0000`)
  }
}

function xmur3(value: string): () => number {
  let state = 1_779_033_703 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    state = Math.imul(state ^ value.charCodeAt(index), 3_432_918_353)
    state = (state << 13) | (state >>> 19)
  }

  return () => {
    state = Math.imul(state ^ (state >>> 16), 2_246_822_507)
    state = Math.imul(state ^ (state >>> 13), 3_266_489_909)
    state ^= state >>> 16
    return state >>> 0
  }
}

function sfc32(aSeed: number, bSeed: number, cSeed: number, dSeed: number): RandomStream {
  let a = aSeed
  let b = bSeed
  let c = cSeed
  let d = dSeed

  return {
    next(): number {
      a >>>= 0
      b >>>= 0
      c >>>= 0
      d >>>= 0

      let result = (a + b) | 0
      a = b ^ (b >>> 9)
      b = (c + (c << 3)) | 0
      c = (c << 21) | (c >>> 11)
      d = (d + 1) | 0
      result = (result + d) | 0
      c = (c + result) | 0

      return (result >>> 0) / UINT32_RANGE
    },
  }
}

function seededStream(seed: string, name: string): RandomStream {
  const hash = xmur3(seed + STREAM_SEPARATOR + name)
  return sfc32(hash(), hash(), hash(), hash())
}

function unseededStream(): RandomStream {
  return {
    next(): number {
      return Math.random()
    },
  }
}

/**
 * Create one source whose named streams are independent and memoized.
 * Re-requesting a name resumes that stream rather than restarting it.
 */
export function createRandomSource(seed: string | null): RandomSource {
  if (seed !== null) rejectSeparator(seed, 'seed')

  const streams = new Map<string, RandomStream>()

  return {
    seeded: seed !== null,
    stream(name: string): RandomStream {
      rejectSeparator(name, 'stream name')

      const existing = streams.get(name)
      if (existing !== undefined) return existing

      const stream = seed === null ? unseededStream() : seededStream(seed, name)
      streams.set(name, stream)
      return stream
    },
  }
}
