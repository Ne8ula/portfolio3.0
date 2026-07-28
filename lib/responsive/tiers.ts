// Responsive tier selection (§A.2). Pure — unit-tested without React or
// WebGL. Runtime consumers (Phase 1 `ResponsivePage`/`ResponsiveStage`)
// derive tier state from available CSS viewport size through these
// functions; browser zoom is never detected directly.

import {
  SUPPORT_PROFILES,
  type SupportProfileId,
  type ViewportSize,
  type ViewportTier,
} from '@/lib/responsive/layout-contract'

/**
 * Runtime responsive tiers. `large` receives no special art direction —
 * content scale is clamped and negative space grows (§A.1). The 320px
 * reflow floor is a guarantee INSIDE `zoom-narrow`, not a separate tier.
 */
export type ResponsiveTier = 'normal' | 'zoom-narrow' | 'large'

export const REFLOW_FLOOR_WIDTH = 320

/**
 * Select the runtime tier for an available CSS viewport.
 * Below either normal threshold → `zoom-narrow` (this wins over `large`
 * when both apply, because reflow/containment is the safety behavior).
 * Above the normal maximum in either dimension → `large`.
 */
export function selectResponsiveTier(
  viewport: ViewportSize,
  profileId: SupportProfileId = 'desktop-laptop-v1',
): ResponsiveTier {
  const profile = SUPPORT_PROFILES[profileId]
  if (viewport.w < profile.normalMin.w || viewport.h < profile.normalMin.h) {
    return 'zoom-narrow'
  }
  if (viewport.w > profile.normalMax.w || viewport.h > profile.normalMax.h) {
    return 'large'
  }
  return 'normal'
}

/**
 * The tier a declared viewport CASE must carry to be consistent with its
 * support profile (§A.7 validation). Viewport cases use `large-smoke`
 * naming because the large tier is exercised as a functional smoke case.
 */
export function expectedViewportTier(
  viewport: ViewportSize,
  profileId: SupportProfileId,
): ViewportTier {
  const tier = selectResponsiveTier(viewport, profileId)
  return tier === 'large' ? 'large-smoke' : tier
}
