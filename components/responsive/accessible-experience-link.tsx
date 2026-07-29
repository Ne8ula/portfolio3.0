'use client'
// AccessibleExperienceLink (§A.7 shared primitive, Phase 1): the ordinary
// DOM entry to a protected region's declared alternative. Route
// alternatives render a real link ONLY once their owning phase has shipped
// the route (never an inert or dead control — DESIGN.md §12); until then
// the region relies on its description while the route remains named
// pending work. Inline-controls alternatives target an in-page region.

import React from 'react'

import type { ProtectedRegionAlternative } from '@/lib/responsive/layout-contract'

export function AccessibleExperienceLink({
  alternative,
  children,
  routeImplemented = false,
}: {
  readonly alternative: ProtectedRegionAlternative
  readonly children: React.ReactNode
  /** Flip when the owning phase ships the route (Phase 2 for /projects).
   *  A route alternative renders nothing until then — a visible link to a
   *  404 would be worse than the pending state it stands in for. */
  readonly routeImplemented?: boolean
}): React.ReactElement | null {
  if (alternative.kind === 'route') {
    if (!routeImplemented) return null
    return (
      <a className="experience-link" href={alternative.href}>
        {children}
      </a>
    )
  }
  if (alternative.kind === 'inline-controls') {
    return (
      <a className="experience-link" href={`#${alternative.regionId}`}>
        {children}
      </a>
    )
  }
  // description/decorative alternatives carry no navigation affordance.
  return null
}
