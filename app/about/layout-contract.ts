import {
  REQUIRED_VIEWPORT_CASES,
  type LayoutContract,
} from '@/lib/responsive/layout-contract'

export const ABOUT_LAYOUT_CONTRACT = {
  id: 'about-v1',
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
