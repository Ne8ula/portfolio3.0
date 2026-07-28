// Required route content contracts (§A.4.2 delivery surfaces, declared per
// §A.7). All four are `planned-phase-2`: the state means "contract
// validated now; delivery tests are named pending work linked to Phase 2"
// — it is never reported as passing. Phase 2 flips every contract to
// `implemented`, removes the pending markers, and makes route coverage and
// initial-response checks blocking.

import type { ContentContract } from '@/lib/content/content-contract'

/** `/` — server-rendered identity/portfolio summary plus visible ordinary
 *  links to VIEW PROJECTS, RECRUITER OVERVIEW, and contact, existing
 *  before boot or cockpit hydration. Today the root is a client-only
 *  cockpit, which is exactly why this stays `planned-phase-2`. */
export const HOME_CONTENT_CONTRACT = {
  id: 'content-home-v1',
  route: '/',
  implementation: 'planned-phase-2',
  purpose: 'entry',
  sources: ['profile', 'project-catalog'],
  delivery: {
    serverRendered: true,
    javascriptIndependent: true,
    webglIndependent: true,
    visibleSemanticHtml: true,
  },
  discoverability: {
    linkedFromInitialHtml: true,
    canonicalUrl: true,
    sitemap: true,
  },
  structuredData: ['Person', 'WebSite'],
} as const satisfies ContentContract

export const PROJECTS_INDEX_CONTENT_CONTRACT = {
  id: 'content-projects-v1',
  route: '/projects',
  implementation: 'planned-phase-2',
  purpose: 'project-index',
  sources: ['project-catalog'],
  delivery: {
    serverRendered: true,
    javascriptIndependent: true,
    webglIndependent: true,
    visibleSemanticHtml: true,
  },
  discoverability: {
    linkedFromInitialHtml: true,
    canonicalUrl: true,
    sitemap: true,
  },
  structuredData: ['CollectionPage', 'ItemList'],
} as const satisfies ContentContract

export const PROJECT_DETAIL_CONTENT_CONTRACT = {
  id: 'content-project-detail-v1',
  route: '/projects/[slug]',
  implementation: 'planned-phase-2',
  purpose: 'project-detail',
  sources: ['project-catalog'],
  delivery: {
    serverRendered: true,
    javascriptIndependent: true,
    webglIndependent: true,
    visibleSemanticHtml: true,
  },
  discoverability: {
    linkedFromInitialHtml: true,
    canonicalUrl: true,
    sitemap: true,
  },
  structuredData: ['CreativeWork'],
} as const satisfies ContentContract

export const RECRUITER_CONTENT_CONTRACT = {
  id: 'content-recruiter-v1',
  route: '/recruiter',
  implementation: 'planned-phase-2',
  purpose: 'recruiter-summary',
  sources: ['profile', 'project-catalog'],
  delivery: {
    serverRendered: true,
    javascriptIndependent: true,
    webglIndependent: true,
    visibleSemanticHtml: true,
  },
  discoverability: {
    linkedFromInitialHtml: true,
    canonicalUrl: true,
    sitemap: true,
  },
  structuredData: ['Person'],
} as const satisfies ContentContract

export const CONTENT_CONTRACTS: readonly ContentContract[] = [
  HOME_CONTENT_CONTRACT,
  PROJECTS_INDEX_CONTENT_CONTRACT,
  PROJECT_DETAIL_CONTENT_CONTRACT,
  RECRUITER_CONTENT_CONTRACT,
]
