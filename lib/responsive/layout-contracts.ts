// Layout-contract registry (§A.7). The registry imports every discovered
// route contract; composed non-route views register an ID here and expose
// the same ID through `data-layout-contract`, which browser tests reconcile
// against this registry.

import { COCKPIT_LAYOUT_CONTRACT } from '@/app/layout-contract'
import { RESPONSIVE_PREVIEW_LAYOUT_CONTRACT } from '@/app/responsive-preview/layout-contract'
import {
  REQUIRED_VIEWPORT_CASES,
  type LayoutContract,
} from '@/lib/responsive/layout-contract'

export { COCKPIT_LAYOUT_CONTRACT, RESPONSIVE_PREVIEW_LAYOUT_CONTRACT }

/**
 * The semantic project catalog — the canonical DOM alternative the cockpit
 * contract points at. The `/projects` route itself is Phase 2 work; its
 * layout behavior is declared now so implementation happens against a
 * pre-existing contract, and the route-coverage scan starts requiring a
 * co-located contract file the moment `app/projects/page.tsx` exists.
 */
export const PROJECTS_INDEX_LAYOUT_CONTRACT = {
  id: 'projects-index-v1',
  supportProfile: 'desktop-laptop-v1',
  protectedRegions: [],
  allowedAdaptations: ['scale', 'reposition', 'reflow'],
  accessibility: {
    keyboard: true,
    reflow: 'standard',
    states: [
      'reduced-motion',
      'high-contrast',
      'reduced-transparency',
      'large-text',
      'large-controls',
    ],
  },
  viewportCases: REQUIRED_VIEWPORT_CASES,
} as const satisfies LayoutContract

/** Every declared contract. Uniqueness/shape are runtime-validated. */
export const LAYOUT_CONTRACTS: readonly LayoutContract[] = [
  COCKPIT_LAYOUT_CONTRACT,
  PROJECTS_INDEX_LAYOUT_CONTRACT,
  RESPONSIVE_PREVIEW_LAYOUT_CONTRACT,
]

/** Route → contract-id map for existing routes (route-coverage scan). */
export const ROUTE_LAYOUT_CONTRACTS: Readonly<Record<string, string>> = {
  '/': COCKPIT_LAYOUT_CONTRACT.id,
  '/responsive-preview': RESPONSIVE_PREVIEW_LAYOUT_CONTRACT.id,
}

/**
 * Routes exempt from the co-located-contract requirement. Every entry needs
 * a written justification here; an empty list is the healthy state.
 */
export const ROUTE_CONTRACT_EXEMPTIONS: readonly string[] = []
