// Co-located layout contract for the Phase 1 representative page (§8
// Phase 1 exit: "an empty representative page demonstrates every tier and
// setting without cockpit-specific code"). Imported by the
// lib/responsive/layout-contracts.ts registry.

import {
  REQUIRED_VIEWPORT_CASES,
  type LayoutContract,
} from '@/lib/responsive/layout-contract'

export const RESPONSIVE_PREVIEW_LAYOUT_CONTRACT = {
  id: 'responsive-preview-v1',
  supportProfile: 'desktop-laptop-v1',
  protectedRegions: [
    {
      // The demo stage is a two-dimensional placeholder composition (no
      // WebGL): non-interactive, described in ordinary text on the page.
      id: 'preview-stage',
      kind: 'two-dimensional',
      interactive: false,
      alternative: { kind: 'description', labelledBy: 'preview-stage-desc' },
    },
  ],
  allowedAdaptations: ['scale', 'reposition', 'reflow', 'contain'],
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
