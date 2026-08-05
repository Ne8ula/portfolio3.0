// Phase 3 DPR performance capture (docs/phase-3-design.md §5).
//
// Run this against one production build served by `next start`. The script
// records the complete 4 viewport × 3 view × 2 DPR matrix as JSON plus a
// human-readable Markdown summary. It never changes DPR_CAP and never makes
// the owner decision.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { arch, cpus, platform, release } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import process from 'node:process'

import { chromium, type Page } from '@playwright/test'

const OUT_DIR = resolve(process.cwd(), 'docs', 'baselines', 'phase-3-dpr')
const NEXT_DIR = resolve(process.cwd(), '.next')
const WARMUP_MS = 5_000
const SAMPLE_MS = 15_000
const RECORD_INDEX = 0

const VIEWPORTS = [
  { id: 'reference-normal', width: 1440, height: 900 },
  { id: 'high-dpr-laptop', width: 1512, height: 982 },
  { id: 'ultrawide', width: 3440, height: 1440 },
  { id: 'large-smoke', width: 3840, height: 2160 },
] as const
const VIEWS = ['cockpit', 'crate', 'deck'] as const
const DPRS = [1, 2] as const

type CaptureKind = 'software' | 'hardware'
type Appearance = 'dark' | 'light'
type PowerState = 'mains' | 'battery' | 'unknown'
type ViewId = (typeof VIEWS)[number]

type CliOptions = {
  readonly captureKind: CaptureKind
  readonly environmentId: string
  readonly baseUrl: string
  readonly appearance: Appearance
  readonly hardwareModel: string
  readonly powerState: PowerState
  readonly buildLogPath: string | null
  readonly browserChannel: string | null
  readonly headed: boolean
  readonly overwrite: boolean
}

type Distribution = {
  readonly samples: number
  readonly min: number
  readonly p01: number
  readonly p05: number
  readonly median: number
  readonly p95: number
  readonly p99: number
  readonly max: number
  readonly mean: number
}

type RendererIdentity = {
  readonly unmaskedVendor: string
  readonly unmaskedRenderer: string
  readonly classification: 'software' | 'hardware'
}

type RuntimeSnapshot = {
  readonly renderer: RendererIdentity
  readonly observedDpr: number
  readonly rendererPixelRatio: number
  readonly canvasWidth: number
  readonly canvasHeight: number
  readonly drawingBufferWidth: number
  readonly drawingBufferHeight: number
  readonly render: {
    readonly calls: number
    readonly triangles: number
  }
  readonly memory: {
    readonly geometries: number
    readonly textures: number
  }
  readonly usedJsHeapSize: number | null
}

type BrowserSample = {
  readonly elapsedMs: number
  readonly frameTimesMs: readonly number[]
  readonly renderCalls: readonly number[]
  readonly triangles: readonly number[]
  readonly before: RuntimeSnapshot
  readonly after: RuntimeSnapshot
}

type CaptureCell = {
  readonly viewport: {
    readonly id: string
    readonly cssWidth: number
    readonly cssHeight: number
  }
  readonly view: ViewId
  readonly requestedDpr: number
  readonly observedDpr: number
  readonly rendererPixelRatio: number
  readonly drawingBuffer: {
    readonly canvasWidth: number
    readonly canvasHeight: number
    readonly contextWidth: number
    readonly contextHeight: number
  }
  readonly frameTimeMs: Distribution
  readonly fps: Distribution
  readonly renderCalls: Distribution
  readonly triangles: Distribution
  readonly memory: RuntimeSnapshot['memory']
  readonly usedJsHeapSize: number | null
  readonly sampleElapsedMs: number
  readonly raw: {
    readonly frameTimesMs: readonly number[]
    readonly renderCalls: readonly number[]
    readonly triangles: readonly number[]
  }
}

type BundleSize = {
  readonly nextBuildId: string
  readonly clientJsBytes: number
  readonly clientCssBytes: number
  readonly clientStaticBytes: number
  readonly serverAppBytes: number
  readonly buildLogPath: string | null
  readonly buildLogSha256: string | null
  readonly buildOutputBundleLines: readonly string[]
}

type CaptureDocument = {
  readonly schemaVersion: 1
  readonly phase: 3
  readonly protocol: 'docs/phase-3-design.md §5'
  readonly captureKind: CaptureKind
  readonly environmentId: string
  readonly capturedAt: string
  readonly git: {
    readonly commit: string
    readonly dirty: boolean
  }
  readonly build: {
    readonly mode: 'production'
    readonly command: 'next build --webpack && next start'
    readonly testHooksAbsent: true
    readonly bundleSize: BundleSize
  }
  readonly environment: {
    readonly browser: string
    readonly browserVersion: string
    readonly os: string
    readonly hardwareModel: string
    readonly powerState: PowerState
    readonly appearance: Appearance
    readonly reducedMotion: 'off'
    readonly renderer: RendererIdentity
  }
  readonly measurement: {
    readonly warmupMs: number
    readonly sampleMs: number
    readonly recordIndex: number
    readonly viewportCount: number
    readonly viewCount: number
    readonly dprCount: number
    readonly cellCount: number
  }
  readonly decisionEligibility: {
    readonly eligible: false
    readonly reason: string
  }
  readonly diagnostics: readonly string[]
  readonly cells: readonly CaptureCell[]
}

function usage(): string {
  return [
    'Usage:',
    '  npx tsx scripts/perf/dpr-baseline.ts \\',
    '    --capture-kind software|hardware \\',
    '    --environment-id <filename-safe-id> [options]',
    '',
    'Required evidence options:',
    '  --capture-kind       software forces SwiftShader; hardware rejects it',
    '  --environment-id     stable slug used for the .json and .md filenames',
    '',
    'Environment options:',
    '  --base-url           production next start URL (default http://127.0.0.1:3000)',
    '  --appearance         dark|light (default dark)',
    '  --hardware-model     capture host description (auto-detected when possible)',
    '  --power-state        mains|battery|unknown (auto-detected when possible)',
    '  --build-log          next build output captured with tee',
    '  --browser-channel    Playwright browser channel, e.g. chrome (hardware only)',
    '  --headed             use a headed browser (recommended for hardware)',
    '  --overwrite          replace an existing capture with the same id',
    '  --help               show this message',
    '',
    'The script always uses the approved 5 s warm-up, 15 s sample, 24-cell',
    'matrix. It emits measurements only; owner certification and the DPR_CAP',
    'decision are separate checkpoint actions.',
  ].join('\n')
}

function commandOutput(command: string, args: readonly string[]): string | null {
  try {
    return execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function detectHardwareModel(): string {
  const macModel = platform() === 'darwin' ? commandOutput('sysctl', ['-n', 'hw.model']) : null
  const cpu = cpus()[0]?.model.trim()
  return [macModel, cpu].filter((value): value is string => Boolean(value)).join(' / ') || 'unknown'
}

function detectPowerState(): PowerState {
  if (platform() !== 'darwin') return 'unknown'
  const output = commandOutput('pmset', ['-g', 'batt'])
  if (output?.includes('AC Power')) return 'mains'
  if (output?.includes('Battery Power')) return 'battery'
  return 'unknown'
}

function nextValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

function parseOptions(args: readonly string[]): CliOptions | null {
  if (args.includes('--help')) {
    console.log(usage())
    return null
  }

  let captureKind: CaptureKind | null = null
  let environmentId: string | null = null
  let baseUrl = 'http://127.0.0.1:3000'
  let appearance: Appearance = 'dark'
  let hardwareModel = detectHardwareModel()
  let powerState = detectPowerState()
  let buildLogPath: string | null = null
  let browserChannel: string | null = null
  let headed = false
  let overwrite = false

  for (let index = 0; index < args.length; index++) {
    const option = args[index]
    if (option === '--capture-kind') {
      const value = nextValue(args, index, option)
      if (value !== 'software' && value !== 'hardware') {
        throw new Error('--capture-kind must be software or hardware')
      }
      captureKind = value
      index++
    } else if (option === '--environment-id') {
      environmentId = nextValue(args, index, option)
      index++
    } else if (option === '--base-url') {
      baseUrl = nextValue(args, index, option)
      index++
    } else if (option === '--appearance') {
      const value = nextValue(args, index, option)
      if (value !== 'dark' && value !== 'light') {
        throw new Error('--appearance must be dark or light')
      }
      appearance = value
      index++
    } else if (option === '--hardware-model') {
      hardwareModel = nextValue(args, index, option)
      index++
    } else if (option === '--power-state') {
      const value = nextValue(args, index, option)
      if (value !== 'mains' && value !== 'battery' && value !== 'unknown') {
        throw new Error('--power-state must be mains, battery, or unknown')
      }
      powerState = value
      index++
    } else if (option === '--build-log') {
      buildLogPath = resolve(nextValue(args, index, option))
      index++
    } else if (option === '--browser-channel') {
      browserChannel = nextValue(args, index, option)
      index++
    } else if (option === '--headed') {
      headed = true
    } else if (option === '--overwrite') {
      overwrite = true
    } else {
      throw new Error(`Unknown option: ${String(option)}`)
    }
  }

  if (!captureKind) throw new Error('--capture-kind is required')
  if (!environmentId) throw new Error('--environment-id is required')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(environmentId)) {
    throw new Error('--environment-id must contain lowercase letters, numbers, and single hyphens')
  }
  if (!URL.canParse(baseUrl)) throw new Error('--base-url must be an absolute URL')
  if (buildLogPath && !existsSync(buildLogPath)) {
    throw new Error(`--build-log does not exist: ${buildLogPath}`)
  }
  if (captureKind === 'software' && browserChannel) {
    throw new Error('--browser-channel is hardware-only; software uses bundled SwiftShader Chromium')
  }

  return {
    captureKind,
    environmentId,
    baseUrl,
    appearance,
    hardwareModel,
    powerState,
    buildLogPath,
    browserChannel,
    headed,
    overwrite,
  }
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? lowerValue
  return lowerValue + (upperValue - lowerValue) * (position - lower)
}

function round(value: number): number {
  return Number(value.toFixed(3))
}

function distribution(values: readonly number[]): Distribution {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (finite.length === 0) {
    throw new Error('Cannot summarize an empty measurement')
  }
  const total = finite.reduce((sum, value) => sum + value, 0)
  return {
    samples: finite.length,
    min: round(finite[0] ?? 0),
    p01: round(percentile(finite, 0.01)),
    p05: round(percentile(finite, 0.05)),
    median: round(percentile(finite, 0.5)),
    p95: round(percentile(finite, 0.95)),
    p99: round(percentile(finite, 0.99)),
    max: round(finite[finite.length - 1] ?? 0),
    mean: round(total / finite.length),
  }
}

function bytesUnder(directory: string, extensions?: ReadonlySet<string>): number {
  if (!existsSync(directory)) return 0
  let total = 0
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      total += bytesUnder(path, extensions)
    } else if (!extensions || extensions.has(extname(entry.name))) {
      total += statSync(path).size
    }
  }
  return total
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
}

function collectBundleSize(buildLogPath: string | null): BundleSize {
  const buildIdPath = join(NEXT_DIR, 'BUILD_ID')
  if (!existsSync(buildIdPath)) {
    throw new Error('Missing .next/BUILD_ID; run next build before capturing')
  }

  const buildLog = buildLogPath ? readFileSync(buildLogPath, 'utf8') : null
  const cleanBuildLog = buildLog ? stripAnsi(buildLog) : null
  const bundleLines = cleanBuildLog
    ? cleanBuildLog
        .split(/\r?\n/)
        .filter((line) => /\b(?:bytes|kB|MB|First Load JS|Route)\b/i.test(line))
    : []

  const staticDirectory = join(NEXT_DIR, 'static')
  return {
    nextBuildId: readFileSync(buildIdPath, 'utf8').trim(),
    clientJsBytes: bytesUnder(staticDirectory, new Set(['.js'])),
    clientCssBytes: bytesUnder(staticDirectory, new Set(['.css'])),
    clientStaticBytes: bytesUnder(staticDirectory),
    serverAppBytes: bytesUnder(join(NEXT_DIR, 'server', 'app')),
    buildLogPath: buildLogPath ? basename(buildLogPath) : null,
    buildLogSha256: buildLog
      ? createHash('sha256').update(buildLog).digest('hex')
      : null,
    buildOutputBundleLines: bundleLines,
  }
}

function classifyRenderer(unmaskedRenderer: string): RendererIdentity['classification'] {
  return /swiftshader|llvmpipe|software rasterizer/i.test(unmaskedRenderer)
    ? 'software'
    : 'hardware'
}

function rendererIdentitiesEqual(a: RendererIdentity, b: RendererIdentity): boolean {
  return (
    a.unmaskedVendor === b.unmaskedVendor &&
    a.unmaskedRenderer === b.unmaskedRenderer &&
    a.classification === b.classification
  )
}

async function waitForCockpit(page: Page): Promise<void> {
  // SwiftShader can spend longer than Playwright's 30 s default preparing the
  // largest DPR 2 drawing buffer before DOMContentLoaded is observed.
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 })
  const enter = page.locator('[data-hud="boot-enter"]')
  await enter.waitFor({ state: 'visible', timeout: 30_000 })
  // The boot control is already visible; dispatching avoids Playwright's
  // stability polling competing with the animated terminal cursor.
  await enter.dispatchEvent('click')
  await page.waitForFunction(
    () => {
      const runtime = window as Window & {
        __cockpitRenderer?: unknown
        __cockpitScene?: unknown
        __cockpitCamera?: unknown
        __setCockpitViewMode?: unknown
        __cockpitDeck?: unknown
        __COCKPIT_TEST_HOOKS__?: unknown
      }
      if (runtime.__COCKPIT_TEST_HOOKS__) {
        throw new Error('DPR evidence must run against production; development test hooks found')
      }
      return Boolean(
        runtime.__cockpitRenderer &&
          runtime.__cockpitScene &&
          runtime.__cockpitCamera &&
          runtime.__setCockpitViewMode &&
          runtime.__cockpitDeck,
      )
    },
    undefined,
    { timeout: 180_000 },
  )
}

async function enterView(page: Page, view: ViewId): Promise<void> {
  if (view === 'cockpit' || view === 'crate') {
    await page.evaluate((target) => {
      const runtime = window as Window & {
        __setCockpitViewMode?: ((mode: string) => void) | null
      }
      if (!runtime.__setCockpitViewMode) throw new Error('view-mode bridge unavailable')
      runtime.__setCockpitViewMode(target)
    }, view)
    await page.waitForFunction(
      (target) => {
        const runtime = window as Window & { __cockpitViewMode?: string | null }
        return runtime.__cockpitViewMode === target
      },
      view,
      { timeout: 180_000 },
    )
    return
  }

  await page.evaluate((index) => {
    type VectorLike = {
      clone(): VectorLike
      x: number
    }
    type ObjectLike = {
      userData: { i?: number }
      children: ObjectLike[]
      geometry?: {
        type?: string
        parameters?: { radiusTop?: number }
      }
      position: VectorLike
      quaternion: VectorLike
      scale: VectorLike
      visible: boolean
      traverse(callback: (object: ObjectLike) => void): void
      getWorldPosition(target: VectorLike): VectorLike
      getWorldQuaternion(target: VectorLike): VectorLike
      getWorldScale(target: VectorLike): VectorLike
    }
    type DeckLike = {
      busy: boolean
      index: number
      play(args: {
        index: number
        from: () => VectorLike
        fromQuat: () => VectorLike
        fromRadius: () => number
        onDepart: () => void
      }): void
    }
    const runtime = window as Window & {
      __cockpitVinyl?: ObjectLike | null
      __cockpitDeck?: DeckLike | null
      __setCockpitViewMode?: ((mode: string) => void) | null
    }
    const crate = runtime.__cockpitVinyl
    const deck = runtime.__cockpitDeck
    const setViewMode = runtime.__setCockpitViewMode
    if (!crate || !deck || !setViewMode) throw new Error('deck orchestration bridge unavailable')
    if (deck.index === index && deck.busy === false) {
      setViewMode('deck')
      return
    }

    setViewMode('crate')
    const matchingRecords: ObjectLike[] = []
    crate.traverse((object) => {
      if (object.userData.i === index) matchingRecords.push(object)
    })
    const record = matchingRecords[0]
    if (!record) throw new Error(`record ${index} not found in crate`)
    const disc = record.children.find(
      (child: ObjectLike) => child.geometry?.type === 'CylinderGeometry',
    )
    if (!disc) throw new Error(`record ${index} disc not found`)
    const localRadius = disc.geometry?.parameters?.radiusTop ?? 0.4508

    deck.play({
      index,
      from() {
        return disc.getWorldPosition(disc.position.clone())
      },
      fromQuat() {
        return disc.getWorldQuaternion(disc.quaternion.clone())
      },
      fromRadius() {
        return localRadius * disc.getWorldScale(disc.scale.clone()).x
      },
      onDepart() {
        disc.visible = false
      },
    })
    setViewMode('deck')
  }, RECORD_INDEX)

  await page.waitForFunction(
    (index) => {
      const runtime = window as Window & {
        __cockpitViewMode?: string | null
        __cockpitDeck?: { index: number; busy: boolean } | null
      }
      return (
        runtime.__cockpitViewMode === 'deck' &&
        runtime.__cockpitDeck?.index === index &&
        runtime.__cockpitDeck.busy === false
      )
    },
    RECORD_INDEX,
    { timeout: 180_000 },
  )
}

async function collectBrowserSample(page: Page): Promise<BrowserSample> {
  return page.evaluate(async (sampleMs) => {
    type RendererInfo = {
      render: { calls: number; triangles: number }
      memory: { geometries: number; textures: number }
    }
    type RendererLike = {
      domElement: HTMLCanvasElement
      info: RendererInfo
      getContext(): WebGLRenderingContext | WebGL2RenderingContext
      getPixelRatio(): number
    }
    type DebugRendererInfo = {
      UNMASKED_VENDOR_WEBGL: number
      UNMASKED_RENDERER_WEBGL: number
    }
    type MemoryPerformance = Performance & {
      memory?: { usedJSHeapSize: number }
    }
    const runtime = window as Window & {
      __cockpitRenderer?: RendererLike | null
    }
    const renderer = runtime.__cockpitRenderer
    if (!renderer) throw new Error('main renderer unavailable while sampling')
    const context = renderer.getContext()
    const debugInfo = context.getExtension(
      'WEBGL_debug_renderer_info',
    ) as DebugRendererInfo | null
    if (!debugInfo) {
      throw new Error('WEBGL_debug_renderer_info unavailable; unmasked renderer is mandatory')
    }

    const identity = {
      unmaskedVendor: String(context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)),
      unmaskedRenderer: String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)),
    }
    // Keep page-evaluated functions free of inferred-name helpers. `tsx`
    // preserves function names by injecting a module-scoped `__name`
    // helper; Playwright serializes this callback without that module
    // scope. Inline the two snapshots and await one rAF at a time so the
    // browser payload stays self-contained.
    const before = {
      renderer: identity,
      observedDpr: window.devicePixelRatio,
      rendererPixelRatio: renderer.getPixelRatio(),
      canvasWidth: renderer.domElement.width,
      canvasHeight: renderer.domElement.height,
      drawingBufferWidth: context.drawingBufferWidth,
      drawingBufferHeight: context.drawingBufferHeight,
      render: {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      },
      memory: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      },
      usedJsHeapSize: (performance as MemoryPerformance).memory?.usedJSHeapSize ?? null,
    }

    const frameTimesMs: number[] = []
    const renderCalls: number[] = []
    const triangles: number[] = []
    let previousFrame = await new Promise<number>((resolveFrame) => {
      requestAnimationFrame(resolveFrame)
    })
    const startedAt = performance.now()

    do {
      const now = await new Promise<number>((resolveFrame) => {
        requestAnimationFrame(resolveFrame)
      })
      frameTimesMs.push(now - previousFrame)
      previousFrame = now
      renderCalls.push(renderer.info.render.calls)
      triangles.push(renderer.info.render.triangles)
    } while (performance.now() - startedAt < sampleMs)

    const after = {
      renderer: identity,
      observedDpr: window.devicePixelRatio,
      rendererPixelRatio: renderer.getPixelRatio(),
      canvasWidth: renderer.domElement.width,
      canvasHeight: renderer.domElement.height,
      drawingBufferWidth: context.drawingBufferWidth,
      drawingBufferHeight: context.drawingBufferHeight,
      render: {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      },
      memory: {
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      },
      usedJsHeapSize: (performance as MemoryPerformance).memory?.usedJSHeapSize ?? null,
    }

    return {
      elapsedMs: performance.now() - startedAt,
      frameTimesMs,
      renderCalls,
      triangles,
      before,
      after,
    }
  }, SAMPLE_MS).then((sample) => {
    const identity = sample.after.renderer
    const renderer: RendererIdentity = {
      ...identity,
      classification: classifyRenderer(identity.unmaskedRenderer),
    }
    return {
      ...sample,
      before: { ...sample.before, renderer },
      after: { ...sample.after, renderer },
    }
  })
}

function buildCell(
  viewport: (typeof VIEWPORTS)[number],
  view: ViewId,
  requestedDpr: number,
  sample: BrowserSample,
): CaptureCell {
  if (sample.frameTimesMs.length === 0) {
    throw new Error(`No animation frames captured for ${viewport.id}/${view}/DPR ${requestedDpr}`)
  }
  if (sample.frameTimesMs.some((frameTime) => !Number.isFinite(frameTime) || frameTime <= 0)) {
    throw new Error(
      `Invalid animation-frame interval for ${viewport.id}/${view}/DPR ${requestedDpr}`,
    )
  }
  const fpsValues = sample.frameTimesMs.map((frameTime) =>
    frameTime > 0 ? 1000 / frameTime : 0,
  )
  return {
    viewport: {
      id: viewport.id,
      cssWidth: viewport.width,
      cssHeight: viewport.height,
    },
    view,
    requestedDpr,
    observedDpr: sample.after.observedDpr,
    rendererPixelRatio: sample.after.rendererPixelRatio,
    drawingBuffer: {
      canvasWidth: sample.after.canvasWidth,
      canvasHeight: sample.after.canvasHeight,
      contextWidth: sample.after.drawingBufferWidth,
      contextHeight: sample.after.drawingBufferHeight,
    },
    frameTimeMs: distribution(sample.frameTimesMs),
    fps: distribution(fpsValues),
    renderCalls: distribution(sample.renderCalls),
    triangles: distribution(sample.triangles),
    memory: sample.after.memory,
    usedJsHeapSize: sample.after.usedJsHeapSize,
    sampleElapsedMs: round(sample.elapsedMs),
    raw: {
      frameTimesMs: sample.frameTimesMs.map(round),
      renderCalls: sample.renderCalls,
      triangles: sample.triangles,
    },
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

function markdownFor(document: CaptureDocument, jsonFilename: string): string {
  const rows = document.cells.map(
    (cell) =>
      `| ${cell.viewport.cssWidth}×${cell.viewport.cssHeight} | ${cell.view} | ${cell.requestedDpr} | ${cell.observedDpr} | ${cell.drawingBuffer.contextWidth}×${cell.drawingBuffer.contextHeight} | ${cell.frameTimeMs.median} | ${cell.frameTimeMs.p95} | ${cell.frameTimeMs.p99} | ${cell.frameTimeMs.max} | ${cell.fps.median} | ${cell.renderCalls.median} | ${cell.triangles.median} | ${cell.memory.geometries} | ${cell.memory.textures} | ${cell.usedJsHeapSize ?? 'unavailable'} |`,
  )
  return [
    `# Phase 3 DPR capture — ${document.environmentId}`,
    '',
    `Status: **${document.captureKind === 'software' ? 'software evidence only — not decision-eligible' : 'hardware measurements awaiting separate owner certification'}**`,
    '',
    `Raw capture: [${jsonFilename}](${jsonFilename})`,
    '',
    '## Environment',
    '',
    `- Captured: ${document.capturedAt}`,
    `- Git commit: \`${document.git.commit}\` (dirty worktree: ${String(document.git.dirty)})`,
    `- Browser: ${document.environment.browser} ${document.environment.browserVersion}`,
    `- OS: ${document.environment.os}`,
    `- Host model: ${document.environment.hardwareModel}`,
    `- Power: ${document.environment.powerState}`,
    `- Appearance: ${document.environment.appearance}`,
    '- Reduced motion: off',
    `- Unmasked vendor: \`${document.environment.renderer.unmaskedVendor}\``,
    `- Unmasked renderer: \`${document.environment.renderer.unmaskedRenderer}\``,
    `- Renderer classification: **${document.environment.renderer.classification}**`,
    '',
    '## Production build',
    '',
    `- Next build id: \`${document.build.bundleSize.nextBuildId}\``,
    `- Client JavaScript: ${formatBytes(document.build.bundleSize.clientJsBytes)}`,
    `- Client CSS: ${formatBytes(document.build.bundleSize.clientCssBytes)}`,
    `- All client static assets: ${formatBytes(document.build.bundleSize.clientStaticBytes)}`,
    `- Server app output: ${formatBytes(document.build.bundleSize.serverAppBytes)}`,
    `- Build-log SHA-256: \`${document.build.bundleSize.buildLogSha256 ?? 'not supplied'}\``,
    '',
    '## Measurements',
    '',
    `Each cell warmed for ${document.measurement.warmupMs / 1000} s and sampled requestAnimationFrame timestamps for ${document.measurement.sampleMs / 1000} s. Record 0 is landed in deck view. FPS is an instantaneous-frame distribution, not an average-only figure.`,
    '',
    '| CSS viewport | View | Requested DPR | Observed DPR | Drawing buffer | Frame median ms | Frame p95 ms | Frame p99 ms | Frame max ms | FPS median | Calls median | Triangles median | Geometries | Textures | JS heap bytes |',
    '|---|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    '## Decision boundary',
    '',
    document.decisionEligibility.reason,
    '',
    'This capture does not certify the owner hardware run or the one-time',
    '`about:gpucrash` recovery check. See `OWNER-CHECKPOINT.template.md`.',
    '',
  ].join('\n')
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  if (!options) return

  mkdirSync(OUT_DIR, { recursive: true })
  const jsonPath = join(OUT_DIR, `${options.environmentId}.json`)
  const markdownPath = join(OUT_DIR, `${options.environmentId}.md`)
  if (!options.overwrite && (existsSync(jsonPath) || existsSync(markdownPath))) {
    throw new Error(
      `Capture already exists for ${options.environmentId}; choose a new id or pass --overwrite`,
    )
  }

  const bundleSize = collectBundleSize(options.buildLogPath)
  const diagnostics: string[] = []
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

    for (const requestedDpr of DPRS) {
      for (const viewport of VIEWPORTS) {
        // Start every viewport from a fresh cockpit. Reusing one page after
        // the first deck cell would leave its landed record and GPU resources
        // alive, so viewport would no longer be the only changed variable.
        const context = await browser.newContext({
          baseURL: options.baseUrl,
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: requestedDpr,
          colorScheme: options.appearance,
          reducedMotion: 'no-preference',
        })
        await context.addInitScript((appearance) => {
          window.localStorage.setItem('cockpit-theme', appearance)
        }, options.appearance)

        const page = await context.newPage()
        page.on('console', (message) => {
          if (message.type() === 'error') {
            const location = message.location()
            const source = location.url
              ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})`
              : ''
            diagnostics.push(
              `${viewport.id}/DPR ${requestedDpr} console.error: ${message.text()}${source}`,
            )
          }
        })
        page.on('response', (response) => {
          if (response.status() >= 400) {
            diagnostics.push(
              `${viewport.id}/DPR ${requestedDpr} HTTP ${response.status()}: ${response.url()}`,
            )
          }
        })
        page.on('pageerror', (error) => {
          diagnostics.push(
            `${viewport.id}/DPR ${requestedDpr} pageerror: ${error.message}`,
          )
        })

        try {
          await waitForCockpit(page)
          for (const view of VIEWS) {
            await enterView(page, view)
            await page.waitForTimeout(WARMUP_MS)
            const sample = await collectBrowserSample(page)
            const renderer = sample.after.renderer
            if (!captureRenderer) {
              captureRenderer = renderer
            } else if (!rendererIdentitiesEqual(captureRenderer, renderer)) {
              throw new Error(
                `Renderer identity changed within one environment: ` +
                  `${captureRenderer.unmaskedRenderer} → ${renderer.unmaskedRenderer}`,
              )
            }
            if (renderer.classification !== options.captureKind) {
              throw new Error(
                `${options.captureKind} capture resolved to ${renderer.classification} renderer: ` +
                  renderer.unmaskedRenderer,
              )
            }
            if (Math.abs(sample.after.observedDpr - requestedDpr) > Number.EPSILON) {
              throw new Error(
                `${viewport.id}/${view}: requested DPR ${requestedDpr}, observed ` +
                  sample.after.observedDpr,
              )
            }

            const cell = buildCell(viewport, view, requestedDpr, sample)
            cells.push(cell)
            console.log(
              `captured ${viewport.width}x${viewport.height} ${view} DPR ${requestedDpr}: ` +
                `median ${cell.frameTimeMs.median} ms, p95 ${cell.frameTimeMs.p95} ms`,
            )
          }
        } finally {
          await page.close()
          await context.close()
        }
      }
    }

    if (!captureRenderer) throw new Error('Capture completed without renderer metadata')
    if (cells.length !== VIEWPORTS.length * VIEWS.length * DPRS.length) {
      throw new Error(`Expected 24 cells, captured ${cells.length}`)
    }

    const browserVersion = browser.version()
    const document: CaptureDocument = {
      schemaVersion: 1,
      phase: 3,
      protocol: 'docs/phase-3-design.md §5',
      captureKind: options.captureKind,
      environmentId: options.environmentId,
      capturedAt: new Date().toISOString(),
      git: {
        commit: commandOutput('git', ['rev-parse', 'HEAD']) ?? 'unknown',
        dirty: Boolean(commandOutput('git', ['status', '--short'])),
      },
      build: {
        mode: 'production',
        command: 'next build --webpack && next start',
        testHooksAbsent: true,
        bundleSize,
      },
      environment: {
        browser: options.browserChannel ?? 'playwright-chromium',
        browserVersion,
        os: `${platform()} ${release()} ${arch()}`,
        hardwareModel: options.hardwareModel,
        powerState: options.powerState,
        appearance: options.appearance,
        reducedMotion: 'off',
        renderer: captureRenderer,
      },
      measurement: {
        warmupMs: WARMUP_MS,
        sampleMs: SAMPLE_MS,
        recordIndex: RECORD_INDEX,
        viewportCount: VIEWPORTS.length,
        viewCount: VIEWS.length,
        dprCount: DPRS.length,
        cellCount: cells.length,
      },
      decisionEligibility: {
        eligible: false,
        reason:
          options.captureKind === 'software'
            ? 'SwiftShader/software measurements exercise the harness only and can never justify a DPR_CAP amendment. DPR_CAP remains pending the owner-certified hardware capture.'
            : 'The script records measurements but cannot certify ownership or decide DPR_CAP. Eligibility requires the separate owner checkpoint record and the approved §5.4 comparison.',
      },
      diagnostics,
      cells,
    }

    writeFileSync(jsonPath, `${JSON.stringify(document, null, 2)}\n`)
    writeFileSync(
      markdownPath,
      markdownFor(document, basename(jsonPath)),
    )
    console.log(`wrote ${jsonPath}`)
    console.log(`wrote ${markdownPath}`)
  } finally {
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
