// Co-located layout contract for the root route (§A.7 route coverage:
// every app/**/page.tsx needs a layout-contract.ts beside it or a
// documented exemption). Imported by the lib/responsive/layout-contracts.ts
// registry — declaring it here alone is not registration.

import {
  REQUIRED_VIEWPORT_CASES,
  type LayoutContract,
} from '@/lib/responsive/layout-contract'

/**
 * The cockpit route. One protected three-dimensional region — the WebGL
 * cockpit stage — whose interactive content (project browsing, project
 * detail, AX/OS dialog) has `/projects` as its canonical DOM alternative
 * (implemented in Phase 2). The ordinary server document beneath the stage
 * reflows while the protected cockpit retains contained-complex-region
 * behavior.
 */
export const COCKPIT_LAYOUT_CONTRACT = {
  id: 'cockpit-v1',
  supportProfile: 'desktop-laptop-v1',
  protectedRegions: [
    {
      id: 'cockpit-stage',
      kind: 'three-dimensional',
      interactive: true,
      alternative: { kind: 'route', href: '/projects' },
    },
  ],
  allowedAdaptations: ['scale', 'reposition', 'reflow', 'contain'],
  accessibility: {
    keyboard: true,
    reflow: 'contained-complex-region',
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

/** Ordinary, wrapping identity chrome; it is not part of the panned artwork. */
export const COCKPIT_IDENTITY_LAYOUT_CONTRACT = {
  id: 'cockpit-identity-v1',
  supportProfile: 'desktop-laptop-v1',
  protectedRegions: [],
  allowedAdaptations: ['reposition', 'reflow'],
  accessibility: { ...COCKPIT_LAYOUT_CONTRACT.accessibility, reflow: 'standard' },
  viewportCases: REQUIRED_VIEWPORT_CASES,
} as const satisfies LayoutContract
