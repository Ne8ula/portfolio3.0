'use client'
// ResponsivePage (§A.7 shared primitive, Phase 1): the wrapper for ordinary
// reflowing content. Derives the responsive tier from the available CSS
// viewport (never from zoom detection), stamps it as `data-responsive-tier`,
// and provides it via context. Content reflows to the 320px floor in one
// primary scroll direction; the large tier caps the designed max width and
// grows negative space (§A.1/§A.2).

import React from 'react'

import {
  selectResponsiveTier,
  type ResponsiveTier,
} from '@/lib/responsive/tiers'

const ResponsiveTierContext = React.createContext<ResponsiveTier>('normal')

export function useResponsiveTier(): ResponsiveTier {
  return React.useContext(ResponsiveTierContext)
}

function readTier(): ResponsiveTier {
  if (typeof window === 'undefined') return 'normal'
  return selectResponsiveTier({ w: window.innerWidth, h: window.innerHeight })
}

export function ResponsivePage({
  children,
  contractId,
}: {
  readonly children: React.ReactNode
  /** Registered LayoutContract id, exposed as data-layout-contract. */
  readonly contractId: string
}): React.ReactElement {
  const [tier, setTier] = React.useState<ResponsiveTier>('normal')

  React.useEffect(() => {
    const update = (): void => setTier(readTier())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Ordinary content owns document scroll (the cockpit's full-bleed shell
  // keeps html/body overflow hidden; reflowing pages opt out of that).
  React.useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-document-scroll', 'reflow')
    return () => root.removeAttribute('data-document-scroll')
  }, [])

  return (
    <ResponsiveTierContext.Provider value={tier}>
      <div
        className="responsive-page"
        data-layout-contract={contractId}
        data-responsive-tier={tier}
      >
        {children}
      </div>
    </ResponsiveTierContext.Provider>
  )
}
