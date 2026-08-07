// Phase 4 deterministic visual scorecard (docs/phase-4-design.md §5.3/§6).
//
// Manual evidence harness, never an npm gate. It starts its own development
// server on a fresh loopback port, captures the fixed 24-cell matrix with
// three fresh-page repeats per cell strictly serially, and refuses dirty-tree
// or cross-renderer evidence.

import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { arch, platform, release } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import type { Camera, Scene, WebGLRenderer } from 'three'

type ScorecardRuntime = Window & {
  __cockpitRenderer?: WebGLRenderer | null
  __cockpitScene?: Scene | null
  __cockpitCamera?: Camera | null
}

export const SCORECARD_CAPTURE = {
  seed: 'ax-cockpit-phase4-v1',
  timeMs: 12_000,
  pauseAmbient: true,
  sampleGrid: 256,
  quantBits: 4,
  sobelThreshold: 24,
  metricsVersion: 1,
} as const

export const SCORECARD_VIEWPORTS = [
  { id: 'reference-normal', w: 1440, h: 900 },
  { id: 'owner-laptop', w: 1512, h: 982 },
] as const
export const SCORECARD_VIEWS = ['cockpit', 'crate', 'deck'] as const
export const SCORECARD_DPRS = [1, 2] as const
export const SCORECARD_THEMES = ['dark', 'light'] as const
export const SCORECARD_REPEATS = 3

const OUT_DIR = resolve(
  process.cwd(),
  'docs',
  'baselines',
  'phase-4-scorecard',
)
const CELL_TIMEOUT_MS = 180_000
const ASSET_TIMEOUT_MS = 45_000
const RECORD_INDEX = 0

// Exact canvas font descriptors used by the scene's texture painters.
// Dynamic smoke glyphs share the 600-weight face; one representative
// descriptor loads that face before construction while every fixed painter
// descriptor is enumerated literally.
export const SCORECARD_FONT_DESCRIPTORS = [
  'italic 500 128px "Cormorant Garamond"',
  '400 60px "Cormorant Garamond"',
  '700 34px "Cormorant Garamond"',
  '400 19px "JetBrains Mono"',
  '500 15px "JetBrains Mono"',
  '500 17px "JetBrains Mono"',
  '500 19px "JetBrains Mono"',
  '500 24px "JetBrains Mono"',
  '500 26px "JetBrains Mono"',
  '500 28px "JetBrains Mono"',
  '500 30px "JetBrains Mono"',
  '600 11px "JetBrains Mono"',
  '600 10px "JetBrains Mono"',
  '600 13px "JetBrains Mono"',
  '600 14px "JetBrains Mono"',
  '600 15px "JetBrains Mono"',
  '600 18px "JetBrains Mono"',
  '600 19px "JetBrains Mono"',
  '600 20px "JetBrains Mono"',
  '600 24px "JetBrains Mono"',
  '600 26px "JetBrains Mono"',
  '600 30px "JetBrains Mono"',
  '600 34px "JetBrains Mono"',
  '600 46px "JetBrains Mono"',
] as const

export type ScorecardMetrics = {
  readonly entropy: number
  readonly edgeDensity: number
  readonly luminanceContrast: number
  readonly dominantShare: number
  readonly distinctColors: number
  readonly nonBackgroundFraction: number
}

export type PixelBuffer = {
  readonly width: number
  readonly height: number
  readonly data: ArrayLike<number>
}

export type RendererIdentity = {
  readonly unmaskedVendor: string
  readonly unmaskedRenderer: string
  readonly classification: 'software' | 'hardware'
}

type CaptureKind = RendererIdentity['classification']
type ViewId = (typeof SCORECARD_VIEWS)[number]
type Theme = (typeof SCORECARD_THEMES)[number]

type CliOptions = {
  readonly captureKind: CaptureKind
  readonly environmentId: string
  readonly port: number | null
  readonly browserChannel: string | null
  readonly headed: boolean
  readonly compareBaseline: string | null
}

export type DiagnosticEntry = {
  readonly kind:
    | 'console.error'
    | 'console.warning'
    | 'pageerror'
    | 'requestfailed'
    | 'http'
  readonly text: string
}

export type ScorecardDiagnosticSummary = {
  readonly unexpectedErrors: 0
  readonly allowlistMatches: Readonly<Record<string, number>>
}

type DiagnosticAllowlistEntry = {
  readonly id: string
  readonly pattern: RegExp
  readonly reason: string
  readonly reviewDate: `${number}-${number}-${number}`
}

// Owner decision 2026-07-28 removed the weather/geolocation fallback, so the
// scorecard begins with no benign diagnostics. Additions require an observed
// entry, a reason, and a review date; disabling a diagnostic class is never
// allowed.
export const SCORECARD_DIAGNOSTIC_ALLOWLIST: readonly DiagnosticAllowlistEntry[] =
  [
    {
      id: 'swiftshader-readpixels-stall',
      pattern:
        /^console\.warning: \[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels$/i,
      reason:
        'Observed on the 2026-08-07 forced-SwiftShader capture when the scorecard intentionally reads the rendered buffer for measurement.',
      reviewDate: '2026-08-07',
    },
    {
      id: 'three-clock-deprecated',
      pattern:
        /^console\.warning: THREE\.Clock: This module has been deprecated\. Please use THREE\.Timer instead\.$/,
      reason:
        'Observed on the 2026-08-07 capture from the two existing scene clocks; migrating those clocks is outside the Phase 4 evidence step.',
      reviewDate: '2026-08-07',
    },
    {
      id: 'vercel-analytics-dev-orb',
      pattern:
        /^requestfailed: net::ERR_BLOCKED_BY_ORB https:\/\/va\.vercel-scripts\.com\/v1\/script\.debug\.js$/,
      reason:
        'Observed on the 2026-08-07 local capture when the development-only Vercel Analytics script was blocked by Chromium ORB after 32 successful repeats.',
      reviewDate: '2026-08-07',
    },
  ]

export function summarizeDiagnostics(
  entries: readonly DiagnosticEntry[],
): ScorecardDiagnosticSummary {
  const matches: Record<string, number> = Object.fromEntries(
    SCORECARD_DIAGNOSTIC_ALLOWLIST.map((entry) => [entry.id, 0]),
  )
  const unexpected: DiagnosticEntry[] = []

  for (const diagnostic of entries) {
    const allowed = SCORECARD_DIAGNOSTIC_ALLOWLIST.find((entry) =>
      entry.pattern.test(`${diagnostic.kind}: ${diagnostic.text}`),
    )
    if (allowed === undefined) {
      unexpected.push(diagnostic)
    } else {
      matches[allowed.id] = (matches[allowed.id] ?? 0) + 1
    }
  }

  if (unexpected.length > 0) {
    throw new Error(
      'Unexpected scorecard diagnostics:\n' +
        unexpected
          .map((entry) => `${entry.kind}: ${entry.text}`)
          .join('\n'),
    )
  }

  return {
    unexpectedErrors: 0,
    allowlistMatches: matches,
  }
}

type CaptureRepeat = ScorecardMetrics

export type CaptureCell = {
  readonly viewport: {
    readonly id: string
    readonly w: number
    readonly h: number
  }
  readonly view: ViewId
  readonly dpr: number
  readonly theme: Theme
  readonly repeats: readonly CaptureRepeat[]
  readonly median: Pick<
    ScorecardMetrics,
    'entropy' | 'edgeDensity' | 'luminanceContrast' | 'dominantShare'
  >
  readonly band: {
    readonly entropy: readonly [number, number]
    readonly edgeDensity: readonly [number, number]
    readonly luminanceContrast: readonly [number, number]
    readonly dominantShare: readonly [number, number]
  }
  readonly diagnostics: ScorecardDiagnosticSummary
}

type BaselineDocument = {
  readonly schemaVersion: 1
  readonly environmentId: string
  readonly capturedAt: string
  readonly git: {
    readonly commit: string
    readonly dirty: false
  }
  readonly renderer: RendererIdentity
  readonly browser: string
  readonly os: string
  readonly buildMode: 'development'
  readonly capture: typeof SCORECARD_CAPTURE
  readonly cells: readonly CaptureCell[]
  readonly history: readonly {
    readonly date: string
    readonly commit: string
    readonly reason: string
  }[]
}

type RunningServer = {
  readonly baseUrl: string
  stop(): Promise<void>
}

/**
 * Pinned metrics implementation. It is deliberately self-contained so its
 * source can be serialized into the browser capture task without a second,
 * drifting implementation.
 */
export function computeVisualMetrics(buffer: PixelBuffer): ScorecardMetrics {
  const width = buffer.width
  const height = buffer.height
  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0 ||
    buffer.data.length < width * height * 4
  ) {
    throw new Error('computeVisualMetrics requires a positive RGBA pixel buffer')
  }

  const strideX = Math.ceil(width / 256)
  const strideY = Math.ceil(height / 256)
  const gridWidth = Math.floor((width - 1) / strideX) + 1
  const gridHeight = Math.floor((height - 1) / strideY) + 1
  const bins = new Map<number, number>()
  const luminance = new Float64Array(gridWidth * gridHeight)

  let sampleCount = 0
  let luminanceSum = 0
  for (let gridY = 0; gridY < gridHeight; gridY += 1) {
    const sourceY = gridY * strideY
    for (let gridX = 0; gridX < gridWidth; gridX += 1) {
      const sourceX = gridX * strideX
      const offset = (sourceY * width + sourceX) * 4
      const red = Number(buffer.data[offset] ?? 0)
      const green = Number(buffer.data[offset + 1] ?? 0)
      const blue = Number(buffer.data[offset + 2] ?? 0)
      const bin = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4)
      bins.set(bin, (bins.get(bin) ?? 0) + 1)
      const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue
      luminance[gridY * gridWidth + gridX] = y
      luminanceSum += y / 255
      sampleCount += 1
    }
  }

  let entropy = 0
  let dominantCount = 0
  for (const count of bins.values()) {
    const probability = count / sampleCount
    entropy -= probability * Math.log2(probability)
    dominantCount = Math.max(dominantCount, count)
  }

  const luminanceMean = luminanceSum / sampleCount
  let luminanceSquaredDeviation = 0
  for (const value of luminance) {
    const normalized = value / 255
    luminanceSquaredDeviation +=
      (normalized - luminanceMean) * (normalized - luminanceMean)
  }
  const luminanceContrast = Math.sqrt(
    luminanceSquaredDeviation / sampleCount,
  )

  let edgeCount = 0
  let interiorCount = 0
  if (gridWidth >= 3 && gridHeight >= 3) {
    for (let y = 1; y < gridHeight - 1; y += 1) {
      for (let x = 1; x < gridWidth - 1; x += 1) {
        const topLeft = luminance[(y - 1) * gridWidth + x - 1] ?? 0
        const top = luminance[(y - 1) * gridWidth + x] ?? 0
        const topRight = luminance[(y - 1) * gridWidth + x + 1] ?? 0
        const left = luminance[y * gridWidth + x - 1] ?? 0
        const right = luminance[y * gridWidth + x + 1] ?? 0
        const bottomLeft = luminance[(y + 1) * gridWidth + x - 1] ?? 0
        const bottom = luminance[(y + 1) * gridWidth + x] ?? 0
        const bottomRight = luminance[(y + 1) * gridWidth + x + 1] ?? 0
        const gradientX =
          -topLeft +
          topRight -
          2 * left +
          2 * right -
          bottomLeft +
          bottomRight
        const gradientY =
          -topLeft -
          2 * top -
          topRight +
          bottomLeft +
          2 * bottom +
          bottomRight
        const magnitude = Math.sqrt(
          gradientX * gradientX + gradientY * gradientY,
        ) / 4
        if (magnitude > 24) edgeCount += 1
        interiorCount += 1
      }
    }
  }

  const dominantShare = dominantCount / sampleCount
  return {
    entropy,
    edgeDensity: interiorCount === 0 ? 0 : edgeCount / interiorCount,
    luminanceContrast,
    dominantShare,
    distinctColors: bins.size,
    nonBackgroundFraction: 1 - dominantShare,
  }
}

function percentileMedian(values: readonly number[]): number {
  if (values.length === 0) throw new Error('Cannot take the median of no values')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function deriveMetricBand(
  metric:
    | 'entropy'
    | 'edgeDensity'
    | 'luminanceContrast'
    | 'dominantShare',
  values: readonly number[],
): readonly [number, number] {
  const median = percentileMedian(values)
  const observedHalfWidth =
    2 * Math.max(...values.map((value) => Math.abs(value - median)))
  const floor =
    metric === 'entropy'
      ? 0.35
      : metric === 'edgeDensity'
        ? Math.max(0.015, median * 0.2)
        : metric === 'luminanceContrast'
          ? Math.max(0.01, median * 0.15)
          : 0.06
  const halfWidth = Math.max(floor, observedHalfWidth)
  return [Math.max(0, median - halfWidth), median + halfWidth]
}

export function classifyRenderer(unmaskedRenderer: string): CaptureKind {
  return /swiftshader|llvmpipe|software rasterizer|\bwarp\b/i.test(
    unmaskedRenderer,
  )
    ? 'software'
    : 'hardware'
}

export function assertRendererAllowed(
  captureKind: CaptureKind,
  actual: RendererIdentity,
  baseline: RendererIdentity | null = null,
): void {
  for (const [field, value] of [
    ['unmaskedVendor', actual.unmaskedVendor],
    ['unmaskedRenderer', actual.unmaskedRenderer],
  ] as const) {
    const normalized = value.trim().toLowerCase()
    if (
      normalized.length === 0 ||
      normalized === 'null' ||
      normalized === 'undefined'
    ) {
      throw new Error(`Scorecard requires a usable ${field} identity`)
    }
  }
  if (captureKind === 'software' && !/swiftshader/i.test(actual.unmaskedRenderer)) {
    throw new Error(
      `Software scorecards require SwiftShader exactly; got ${actual.unmaskedRenderer}`,
    )
  }
  if (captureKind === 'hardware' && actual.classification !== 'hardware') {
    throw new Error(
      `Hardware scorecard resolved to ${actual.classification}: ${actual.unmaskedRenderer}`,
    )
  }
  if (actual.classification !== captureKind) {
    throw new Error(
      `${captureKind} scorecard resolved to ${actual.classification}: ${actual.unmaskedRenderer}`,
    )
  }
  if (
    baseline &&
    (
      baseline.unmaskedVendor !== actual.unmaskedVendor ||
      baseline.unmaskedRenderer !== actual.unmaskedRenderer ||
      baseline.classification !== actual.classification
    )
  ) {
    throw new Error(
      `Cross-backend comparison refused: baseline "${baseline.unmaskedRenderer}" ` +
        `does not match capture "${actual.unmaskedRenderer}"`,
    )
  }
}

export function assertCleanGitStatus(status: string): void {
  if (status.trim().length > 0) {
    throw new Error(
      'Visual scorecard capture requires a clean git worktree at the committed harness revision',
    )
  }
}

const COMPARED_METRICS = [
  'entropy',
  'edgeDensity',
  'luminanceContrast',
  'dominantShare',
] as const

function cellKey(
  cell: Pick<CaptureCell, 'viewport' | 'view' | 'dpr' | 'theme'>,
): string {
  return [
    cell.viewport.id,
    `${cell.viewport.w}x${cell.viewport.h}`,
    cell.view,
    `dpr-${cell.dpr}`,
    cell.theme,
  ].join('/')
}

export function assertScorecardWithinBaseline(
  actualCells: readonly CaptureCell[],
  baselineCells: readonly CaptureCell[],
): void {
  if (actualCells.length !== baselineCells.length) {
    throw new Error(
      `Baseline matrix mismatch: captured ${actualCells.length} cells, baseline has ${baselineCells.length}`,
    )
  }
  const baselineByKey = new Map(
    baselineCells.map((cell) => [cellKey(cell), cell] as const),
  )
  if (baselineByKey.size !== baselineCells.length) {
    throw new Error('Baseline matrix contains duplicate cells')
  }
  for (const actual of actualCells) {
    const key = cellKey(actual)
    const baseline = baselineByKey.get(key)
    if (!baseline) throw new Error(`Baseline cell missing: ${key}`)
    for (const metric of COMPARED_METRICS) {
      const [minimum, maximum] = baseline.band[metric]
      const value = actual.median[metric]
      if (value < minimum || value > maximum) {
        throw new Error(
          `${key} ${metric} ${value} is outside baseline band [${minimum}, ${maximum}]`,
        )
      }
    }
  }
}

export async function runStrictlySerial<T, R>(
  items: readonly T[],
  capture: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (item === undefined) continue
    results.push(await capture(item, index))
  }
  return results
}

function commandOutput(command: string, args: readonly string[]): string {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function usage(): string {
  return [
    'Usage:',
    '  npx tsx scripts/perf/visual-scorecard.ts \\',
    '    --capture-kind software|hardware \\',
    '    --environment-id <filename-safe-id> [options]',
    '',
    'Options:',
    '  --port <port>          dedicated loopback dev-server port (default: fresh ephemeral)',
    '  --browser-channel <id> hardware browser channel, e.g. chrome',
    '  --headed               headed browser (required for hardware capture)',
    '  --compare-baseline <p> require exact renderer identity and metric bands',
    '  --help                 show this message',
    '',
    'The harness refuses dirty trees, owns a fresh development server, and',
    'captures 24 cells × 3 repeats strictly serially. Never run it beside e2e.',
  ].join('\n')
}

function requiredValue(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${option} needs a value`)
  return value
}

function parseOptions(args: readonly string[]): CliOptions | null {
  if (args.includes('--help')) {
    console.log(usage())
    return null
  }
  let captureKind: CaptureKind | null = null
  let environmentId: string | null = null
  let port: number | null = null
  let browserChannel: string | null = null
  let headed = false
  let compareBaseline: string | null = null

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]
    if (option === '--capture-kind') {
      const value = requiredValue(args, index, option)
      if (value !== 'software' && value !== 'hardware') {
        throw new Error('--capture-kind must be software or hardware')
      }
      captureKind = value
      index += 1
    } else if (option === '--environment-id') {
      environmentId = requiredValue(args, index, option)
      index += 1
    } else if (option === '--port') {
      const value = Number(requiredValue(args, index, option))
      if (!Number.isInteger(value) || value < 1024 || value > 65535) {
        throw new Error('--port must be an integer from 1024 through 65535')
      }
      port = value
      index += 1
    } else if (option === '--browser-channel') {
      browserChannel = requiredValue(args, index, option)
      index += 1
    } else if (option === '--headed') {
      headed = true
    } else if (option === '--compare-baseline') {
      compareBaseline = resolve(requiredValue(args, index, option))
      index += 1
    } else {
      throw new Error(`Unknown option: ${String(option)}`)
    }
  }

  if (!captureKind) throw new Error('--capture-kind is required')
  if (!environmentId) throw new Error('--environment-id is required')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(environmentId)) {
    throw new Error('--environment-id must be a lowercase filename-safe slug')
  }
  if (captureKind === 'software' && browserChannel) {
    throw new Error('--browser-channel is hardware-only')
  }
  if (captureKind === 'hardware' && (!headed || !browserChannel)) {
    throw new Error('Hardware capture requires --headed and --browser-channel')
  }
  if (compareBaseline && !existsSync(compareBaseline)) {
    throw new Error(`Baseline not found: ${compareBaseline}`)
  }
  return {
    captureKind,
    environmentId,
    port,
    browserChannel,
    headed,
    compareBaseline,
  }
}

async function reservePort(requested: number | null): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(requested ?? 0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not reserve a loopback server port'))
        return
      }
      const port = address.port
      server.close((error) => {
        if (error) reject(error)
        else resolvePort(port)
      })
    })
  })
}

async function waitForServer(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 120_000
  let lastError = 'not ready'
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Development server exited early with code ${child.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl, { redirect: 'manual' })
      if (response.status >= 200 && response.status < 500) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`Development server did not become ready: ${lastError}`)
}

async function startDevelopmentServer(requestedPort: number | null): Promise<RunningServer> {
  const port = await reservePort(requestedPort)
  const child = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, BROWSER: 'none' },
    },
  )
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    await waitForServer(baseUrl, child)
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
  return {
    baseUrl,
    async stop(): Promise<void> {
      if (child.exitCode !== null) return
      child.kill('SIGTERM')
      await Promise.race([
        new Promise<void>((resolveExit) => child.once('exit', () => resolveExit())),
        new Promise<void>((resolveTimeout) =>
          setTimeout(() => {
            child.kill('SIGKILL')
            resolveTimeout()
          }, 5_000),
        ),
      ])
    },
  }
}

function installDiagnostics(page: Page): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = []
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    entries.push({
      kind: message.type() === 'error' ? 'console.error' : 'console.warning',
      text: message.text(),
    })
  })
  page.on('pageerror', (error) => {
    entries.push({ kind: 'pageerror', text: error.message })
  })
  page.on('requestfailed', (request) => {
    entries.push({
      kind: 'requestfailed',
      text: `${request.failure()?.errorText ?? 'request failed'} ${request.url()}`,
    })
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    entries.push({
      kind: 'http',
      text: `HTTP ${response.status()} ${response.url()}`,
    })
  })
  return entries
}

async function preparePage(
  page: Page,
  view: ViewId,
  theme: Theme,
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForFunction(() => Boolean(window.__COCKPIT_TEST_HOOKS__), undefined, {
    timeout: 30_000,
  })
  await page.evaluate(async (descriptors) => {
    for (const descriptor of descriptors) {
      await document.fonts.load(descriptor)
    }
    await document.fonts.ready
    const missing = descriptors.filter(
      (descriptor) => !document.fonts.check(descriptor),
    )
    if (missing.length > 0) {
      throw new Error(`Required canvas fonts unavailable: ${missing.join(', ')}`)
    }
  }, SCORECARD_FONT_DESCRIPTORS)
  await page.evaluate((capture) => {
    window.__COCKPIT_TEST_HOOKS__!.configureVisualCapture(capture)
    window.__COCKPIT_TEST_HOOKS__!.skipIntro()
  }, SCORECARD_CAPTURE)
  await page.waitForFunction(
    (expectedTheme) =>
      window.__cockpitTheme === expectedTheme &&
      document.documentElement.getAttribute('data-appearance') === expectedTheme &&
      document.documentElement.getAttribute('data-theme') === expectedTheme,
    theme,
    { timeout: 30_000 },
  )
  if (view === 'deck') {
    await page.evaluate((index) =>
      window.__COCKPIT_TEST_HOOKS__!.playRecord(index),
    RECORD_INDEX)
  } else {
    await page.evaluate((mode) =>
      window.__COCKPIT_TEST_HOOKS__!.enterView(mode),
    view)
  }
  await page.waitForFunction(
    () => window.__COCKPIT_TEST_HOOKS__!.isSettled(),
    undefined,
    { timeout: CELL_TIMEOUT_MS },
  )
  await page.waitForFunction(
    () => window.__COCKPIT_TEST_HOOKS__!.getVisualAssetState().pending === 0,
    undefined,
    { timeout: ASSET_TIMEOUT_MS },
  )
  const assets = await page.evaluate(
    () => window.__COCKPIT_TEST_HOOKS__!.getVisualAssetState(),
  )
  if (assets.failed > 0) {
    throw new Error(`${assets.failed} of ${assets.total} visual assets failed`)
  }
}

async function rendererIdentity(page: Page): Promise<RendererIdentity> {
  const identity = await page.evaluate(() => {
    const renderer = (window as ScorecardRuntime).__cockpitRenderer
    if (!renderer) throw new Error('Main renderer unavailable')
    const context = renderer.getContext()
    const extension = context.getExtension('WEBGL_debug_renderer_info')
    if (!extension) {
      throw new Error('WEBGL_debug_renderer_info is required for scorecards')
    }
    return {
      unmaskedVendor: String(
        context.getParameter(extension.UNMASKED_VENDOR_WEBGL),
      ),
      unmaskedRenderer: String(
        context.getParameter(extension.UNMASKED_RENDERER_WEBGL),
      ),
    }
  })
  return {
    ...identity,
    classification: classifyRenderer(identity.unmaskedRenderer),
  }
}

async function captureMetrics(page: Page): Promise<ScorecardMetrics> {
  const metricsSource = computeVisualMetrics.toString()
  return page.evaluate(async (source) => {
    const runtime = window as ScorecardRuntime
    const renderer = runtime.__cockpitRenderer
    const scene = runtime.__cockpitScene
    const camera = runtime.__cockpitCamera
    if (!renderer || !scene || !camera) {
      throw new Error('Renderer bridge incomplete during scorecard capture')
    }
    renderer.render(scene, camera)
    const dataUrl = renderer.domElement.toDataURL('image/png')
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const decode = document.createElement('canvas')
    decode.width = renderer.domElement.width
    decode.height = renderer.domElement.height
    const context = decode.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Could not create scorecard decode context')
    context.drawImage(image, 0, 0)
    const imageData = context.getImageData(0, 0, decode.width, decode.height)
    const compute = new Function(`return (${source})`)()
    return compute({
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
    })
  }, metricsSource)
}

function round(value: number): number {
  return Number(value.toFixed(6))
}

function summarizeCell(
  viewport: (typeof SCORECARD_VIEWPORTS)[number],
  view: ViewId,
  dpr: number,
  theme: Theme,
  repeats: readonly CaptureRepeat[],
  diagnostics: ScorecardDiagnosticSummary,
): CaptureCell {
  const metricNames = [
    'entropy',
    'edgeDensity',
    'luminanceContrast',
    'dominantShare',
  ] as const
  const median = Object.fromEntries(
    metricNames.map((metric) => [
      metric,
      round(percentileMedian(repeats.map((repeat) => repeat[metric]))),
    ]),
  ) as CaptureCell['median']
  const band = Object.fromEntries(
    metricNames.map((metric) => [
      metric,
      deriveMetricBand(
        metric,
        repeats.map((repeat) => repeat[metric]),
      ).map(round),
    ]),
  ) as unknown as CaptureCell['band']
  return {
    viewport,
    view,
    dpr,
    theme,
    repeats: repeats.map((repeat) =>
      Object.fromEntries(
        Object.entries(repeat).map(([name, value]) => [name, round(value)]),
      ) as unknown as CaptureRepeat,
    ),
    median,
    band,
    diagnostics,
  }
}

async function captureRepeat(
  browser: Browser,
  baseUrl: string,
  captureKind: CaptureKind,
  baselineRenderer: RendererIdentity | null,
  expectedRenderer: RendererIdentity | null,
  viewport: (typeof SCORECARD_VIEWPORTS)[number],
  view: ViewId,
  dpr: number,
  theme: Theme,
): Promise<{
  metrics: CaptureRepeat
  renderer: RendererIdentity
  diagnostics: ScorecardDiagnosticSummary
}> {
  let context: BrowserContext | null = null
  try {
    context = await browser.newContext({
      baseURL: baseUrl,
      viewport: { width: viewport.w, height: viewport.h },
      deviceScaleFactor: dpr,
      colorScheme: theme,
      reducedMotion: 'no-preference',
    })
    await context.addInitScript((appearance) => {
      window.localStorage.setItem('cockpit-theme', appearance)
    }, theme)
    const page = await context.newPage()
    const diagnostics = installDiagnostics(page)
    await preparePage(page, view, theme)
    const renderer = await rendererIdentity(page)
    assertRendererAllowed(
      captureKind,
      renderer,
      baselineRenderer ?? expectedRenderer,
    )
    const metrics = await captureMetrics(page)
    if (
      metrics.distinctColors < 8 ||
      metrics.dominantShare >= 0.98 ||
      metrics.nonBackgroundFraction <= 0.02
    ) {
      throw new Error(
        `${viewport.id}/${view}/DPR ${dpr}/${theme}: blank-canvas precondition failed`,
      )
    }
    return {
      metrics,
      renderer,
      diagnostics: summarizeDiagnostics(diagnostics),
    }
  } finally {
    await context?.close()
  }
}

function markdownFor(document: BaselineDocument, jsonFilename: string): string {
  const rows = document.cells.map((cell) =>
    `| ${cell.viewport.w}×${cell.viewport.h} | ${cell.view} | ${cell.dpr} | ${cell.theme} | ${cell.median.entropy} | ${cell.median.edgeDensity} | ${cell.median.luminanceContrast} | ${cell.median.dominantShare} |`,
  )
  return [
    `# Phase 4 visual scorecard — ${document.environmentId}`,
    '',
    `Raw capture: [${jsonFilename}](${jsonFilename})`,
    '',
    `- Captured: ${document.capturedAt}`,
    `- Git commit: \`${document.git.commit}\` (dirty: false)`,
    `- Renderer: \`${document.renderer.unmaskedRenderer}\``,
    `- Vendor: \`${document.renderer.unmaskedVendor}\``,
    `- Classification: ${document.renderer.classification}`,
    `- Browser: ${document.browser}`,
    `- OS: ${document.os}`,
    '',
    '| Viewport | View | DPR | Theme | Entropy | Edge density | Luminance contrast | Dominant share |',
    '|---|---|---:|---|---:|---:|---:|---:|',
    ...rows,
    '',
    'Every row is the median of three fresh-page, strictly serial repeats.',
    'Tolerance bands and zero-unexpected-error diagnostics are in the JSON.',
    '',
  ].join('\n')
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  if (!options) return

  const gitStatus = commandOutput('git', ['status', '--porcelain', '--untracked-files=normal'])
  assertCleanGitStatus(gitStatus)
  const gitCommit = commandOutput('git', ['rev-parse', 'HEAD'])
  const baseline = options.compareBaseline
    ? JSON.parse(readFileSync(options.compareBaseline, 'utf8')) as BaselineDocument
    : null

  mkdirSync(OUT_DIR, { recursive: true })
  const jsonPath = join(OUT_DIR, `${options.environmentId}.json`)
  const markdownPath = join(OUT_DIR, `${options.environmentId}.md`)
  if (existsSync(jsonPath) || existsSync(markdownPath)) {
    throw new Error(
      `Output exists for ${options.environmentId}; evidence is immutable, choose another id`,
    )
  }

  const server = await startDevelopmentServer(options.port)
  const launchArgs =
    options.captureKind === 'software'
      ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : []
  const browser = await chromium.launch({
    args: launchArgs,
    channel: options.browserChannel ?? undefined,
    headless: !options.headed,
  })
  try {
    const cells: CaptureCell[] = []
    let captureRenderer: RendererIdentity | null = null
    const matrix = SCORECARD_VIEWPORTS.flatMap((viewport) =>
      SCORECARD_VIEWS.flatMap((view) =>
        SCORECARD_DPRS.flatMap((dpr) =>
          SCORECARD_THEMES.map((theme) => ({ viewport, view, dpr, theme })),
        ),
      ),
    )

    await runStrictlySerial(matrix, async ({ viewport, view, dpr, theme }) => {
      const repeats: CaptureRepeat[] = []
      const allowlistMatches: Record<string, number> = {}
      for (let repeat = 0; repeat < SCORECARD_REPEATS; repeat += 1) {
        const result = await captureRepeat(
          browser,
          server.baseUrl,
          options.captureKind,
          baseline?.renderer ?? null,
          captureRenderer,
          viewport,
          view,
          dpr,
          theme,
        )
        captureRenderer ??= result.renderer
        repeats.push(result.metrics)
        for (const [id, count] of Object.entries(
          result.diagnostics.allowlistMatches,
        )) {
          allowlistMatches[id] = (allowlistMatches[id] ?? 0) + count
        }
        console.log(
          `captured ${viewport.w}x${viewport.h} ${view} DPR ${dpr} ${theme} repeat ${repeat + 1}/${SCORECARD_REPEATS}`,
        )
      }
      cells.push(
        summarizeCell(viewport, view, dpr, theme, repeats, {
          unexpectedErrors: 0,
          allowlistMatches,
        }),
      )
    })

    if (!captureRenderer) throw new Error('Scorecard captured no renderer')
    if (cells.length !== 24) throw new Error(`Expected 24 cells, got ${cells.length}`)
    if (baseline) {
      if (
        baseline.schemaVersion !== 1 ||
        JSON.stringify(baseline.capture) !== JSON.stringify(SCORECARD_CAPTURE)
      ) {
        throw new Error('Baseline schema or canonical capture configuration mismatch')
      }
      assertScorecardWithinBaseline(cells, baseline.cells)
    }
    const capturedAt = new Date().toISOString()
    const document: BaselineDocument = {
      schemaVersion: 1,
      environmentId: options.environmentId,
      capturedAt,
      git: { commit: gitCommit, dirty: false },
      renderer: captureRenderer,
      browser: `${options.browserChannel ?? 'playwright-chromium'} ${browser.version()}`,
      os: `${platform()} ${release()} ${arch()}`,
      buildMode: 'development',
      capture: SCORECARD_CAPTURE,
      cells,
      history: baseline
        ? [
            ...baseline.history,
            {
              date: capturedAt,
              commit: gitCommit,
              reason: `comparison capture against ${basename(options.compareBaseline!)}`,
            },
          ]
        : [{ date: capturedAt, commit: gitCommit, reason: 'initial baseline' }],
    }
    writeFileSync(jsonPath, `${JSON.stringify(document, null, 2)}\n`)
    writeFileSync(markdownPath, markdownFor(document, basename(jsonPath)))
    console.log(`wrote ${jsonPath}`)
    console.log(`wrote ${markdownPath}`)
  } finally {
    await browser.close()
    await server.stop()
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
