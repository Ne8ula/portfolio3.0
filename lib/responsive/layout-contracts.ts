// Layout-contract registry (§A.7). The registry imports every discovered
// route contract; composed non-route views register an ID here and expose
// the same ID through `data-layout-contract`, which browser tests reconcile
// against this registry.

import { COCKPIT_LAYOUT_CONTRACT } from '@/app/layout-contract'
import { ABOUT_LAYOUT_CONTRACT } from '@/app/about/layout-contract'
import { PROJECT_DETAIL_LAYOUT_CONTRACT } from '@/app/projects/[slug]/layout-contract'
import { PROJECTS_INDEX_LAYOUT_CONTRACT } from '@/app/projects/layout-contract'
import { RESPONSIVE_PREVIEW_LAYOUT_CONTRACT } from '@/app/responsive-preview/layout-contract'
import type { LayoutContract } from '@/lib/responsive/layout-contract'

export {
  ABOUT_LAYOUT_CONTRACT,
  COCKPIT_LAYOUT_CONTRACT,
  PROJECT_DETAIL_LAYOUT_CONTRACT,
  PROJECTS_INDEX_LAYOUT_CONTRACT,
  RESPONSIVE_PREVIEW_LAYOUT_CONTRACT,
}

/** Every declared contract. Uniqueness/shape are runtime-validated. */
export const LAYOUT_CONTRACTS: readonly LayoutContract[] = [
  COCKPIT_LAYOUT_CONTRACT,
  PROJECTS_INDEX_LAYOUT_CONTRACT,
  PROJECT_DETAIL_LAYOUT_CONTRACT,
  ABOUT_LAYOUT_CONTRACT,
  RESPONSIVE_PREVIEW_LAYOUT_CONTRACT,
]

/** Route → contract-id map for existing routes (route-coverage scan). */
export const ROUTE_LAYOUT_CONTRACTS: Readonly<Record<string, string>> = {
  '/': COCKPIT_LAYOUT_CONTRACT.id,
  '/about': ABOUT_LAYOUT_CONTRACT.id,
  '/projects': PROJECTS_INDEX_LAYOUT_CONTRACT.id,
  '/projects/[slug]': PROJECT_DETAIL_LAYOUT_CONTRACT.id,
  '/responsive-preview': RESPONSIVE_PREVIEW_LAYOUT_CONTRACT.id,
}

/**
 * Routes exempt from the co-located-contract requirement. Every entry needs
 * a written justification here; an empty list is the healthy state.
 */
export const ROUTE_CONTRACT_EXEMPTIONS: readonly string[] = []
