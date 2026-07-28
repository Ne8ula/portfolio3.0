// LayoutContract — the per-view responsive declaration every page or
// composed view must carry (§A.7 of docs/hud-responsive-layout-plan.md).
//
// Strict enforcement-island module: no `@ts-nocheck`, no browser globals.
// Contracts are declared in lib/responsive/layout-contracts.ts with
// `satisfies LayoutContract`; runtime validation lives in
// lib/responsive/contract-validation.ts so malformed data is caught even
// where TypeScript is bypassed.

export type AccessibilityState =
  | 'reduced-motion'
  | 'high-contrast'
  | 'reduced-transparency'
  | 'large-text'
  | 'large-controls'

/** Every custom accessibility state a route-level contract must declare. */
export const REQUIRED_ACCESSIBILITY_STATES: readonly AccessibilityState[] = [
  'reduced-motion',
  'high-contrast',
  'reduced-transparency',
  'large-text',
  'large-controls',
]

export type ProtectedRegionAlternative =
  | { readonly kind: 'route'; readonly href: `/${string}` }
  | { readonly kind: 'inline-controls'; readonly regionId: string }
  | { readonly kind: 'description'; readonly labelledBy: string }
  | { readonly kind: 'decorative' }

export type ProtectedRegion = {
  readonly id: string
  readonly kind: 'three-dimensional' | 'two-dimensional'
  readonly interactive: boolean
  /** Interactive regions must declare a route or inline-controls
   *  alternative; description/decorative are rejected for them (§A.7). */
  readonly alternative: ProtectedRegionAlternative
}

export type ViewportSize = { readonly w: number; readonly h: number }

/**
 * Named support profiles (§A.7, revision 6 amendment 17). Dimensions live
 * here rather than as literal types on every contract, so today's
 * desktop/laptop range stays mandatory without baking numbers into each
 * contract. `desktop-laptop-v1` is currently the ONLY allowed profile; a
 * future mobile plan adds a new profile as a reviewed change here.
 */
export const SUPPORT_PROFILES = {
  'desktop-laptop-v1': {
    normalMin: { w: 1024, h: 600 },
    normalMax: { w: 3440, h: 1536 },
  },
} as const satisfies Record<
  string,
  { readonly normalMin: ViewportSize; readonly normalMax: ViewportSize }
>

export type SupportProfileId = keyof typeof SUPPORT_PROFILES

/** Profiles current routes are allowed to declare (validated at runtime). */
export const ALLOWED_SUPPORT_PROFILES: readonly SupportProfileId[] = [
  'desktop-laptop-v1',
]

export type ViewportTier = 'normal' | 'zoom-narrow' | 'large-smoke'

export type ViewportCase = {
  readonly id: string
  readonly w: number
  readonly h: number
  readonly tier: ViewportTier
}

export type LayoutAdaptation = 'scale' | 'reposition' | 'reflow' | 'contain'

export const LAYOUT_ADAPTATIONS: readonly LayoutAdaptation[] = [
  'scale',
  'reposition',
  'reflow',
  'contain',
]

export type LayoutContract = {
  readonly id: string
  readonly supportProfile: SupportProfileId
  readonly protectedRegions: readonly ProtectedRegion[]
  readonly allowedAdaptations: readonly LayoutAdaptation[]
  readonly accessibility: {
    readonly keyboard: true
    readonly reflow: 'standard' | 'contained-complex-region'
    readonly states: readonly AccessibilityState[]
  }
  readonly viewportCases: readonly ViewportCase[]
}

/**
 * The §9.1 CSS-viewport matrix every route contract must cover. These are
 * CSS viewport sizes, not monitor resolutions. Browser-zoom behavior is
 * additionally tested with real zoom (§9.1); `512×300` approximates
 * `1024×600` at 200% zoom but does not substitute for a real zoom test.
 */
export const REQUIRED_VIEWPORT_CASES: readonly ViewportCase[] = [
  { id: 'normal-1024x600', w: 1024, h: 600, tier: 'normal' },
  { id: 'normal-1024x768', w: 1024, h: 768, tier: 'normal' },
  { id: 'normal-1280x720', w: 1280, h: 720, tier: 'normal' },
  { id: 'normal-1280x800', w: 1280, h: 800, tier: 'normal' },
  { id: 'normal-1366x650', w: 1366, h: 650, tier: 'normal' },
  { id: 'normal-1366x768', w: 1366, h: 768, tier: 'normal' },
  { id: 'normal-1440x900', w: 1440, h: 900, tier: 'normal' },
  { id: 'normal-1512x982', w: 1512, h: 982, tier: 'normal' },
  { id: 'normal-1920x1080', w: 1920, h: 1080, tier: 'normal' },
  { id: 'normal-2048x1536', w: 2048, h: 1536, tier: 'normal' },
  { id: 'normal-2560x1440', w: 2560, h: 1440, tier: 'normal' },
  { id: 'normal-3440x1440', w: 3440, h: 1440, tier: 'normal' },
  { id: 'zoom-800x450', w: 800, h: 450, tier: 'zoom-narrow' },
  { id: 'zoom-683x325', w: 683, h: 325, tier: 'zoom-narrow' },
  { id: 'zoom-512x300', w: 512, h: 300, tier: 'zoom-narrow' },
  { id: 'zoom-320x568', w: 320, h: 568, tier: 'zoom-narrow' },
  { id: 'large-3840x2160', w: 3840, h: 2160, tier: 'large-smoke' },
]
