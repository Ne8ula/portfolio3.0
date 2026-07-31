// Required route content contracts (§A.4.2 delivery surfaces, declared per
// §A.7). Phase 2 implements all four; PHASE_2_COMPLETE makes any regression
// to `planned-phase-2` a blocking validation failure.

import type { ContentContract } from '@/lib/content/content-contract'

/** `/` — server-rendered identity/portfolio summary plus visible ordinary
 *  links to View projects, About, and contact before cockpit hydration. */
export const HOME_CONTENT_CONTRACT = {
  id: 'content-home-v1',
  route: '/',
  implementation: 'implemented',
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
  implementation: 'implemented',
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
  implementation: 'implemented',
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

export const ABOUT_CONTENT_CONTRACT = {
  id: 'content-about-v1',
  route: '/about',
  implementation: 'implemented',
  purpose: 'professional-summary',
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
  ABOUT_CONTENT_CONTRACT,
]
