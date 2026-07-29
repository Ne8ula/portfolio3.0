// Phase 1 representative page (plan §8 Phase 1 exit): demonstrates every
// responsive tier and accessibility setting through the shared primitives
// alone — no cockpit-specific code, no canonical profile/project content
// (which is Phase 2's job on the real routes).

import type { Metadata } from 'next'

import { ResponsivePreviewClient } from './preview-client'

export const metadata: Metadata = {
  title: 'Responsive foundation preview',
  description:
    'Phase 1 demonstration of the shared responsive tiers and accessibility states.',
  robots: { index: false },
}

export default function ResponsivePreviewPage() {
  return <ResponsivePreviewClient />
}
