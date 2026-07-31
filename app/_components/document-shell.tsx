import type React from 'react'

import { ResponsivePage } from '@/components/responsive/responsive-page'
import { PROFILE } from '@/lib/portfolio/profile'
import { SITE_NAV } from '@/lib/site/navigation'
import { SITE_ROUTES } from '@/lib/site/site'

export function DocumentShell({
  children,
  contentContractId,
  layoutContractId,
}: {
  readonly children: React.ReactNode
  readonly contentContractId: string
  readonly layoutContractId: string
}): React.ReactElement {
  return (
    <ResponsivePage
      contractId={layoutContractId}
      contentContractId={contentContractId}
      layoutRegion="app-shell"
    >
      <a className="home-skip-link" data-hud="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="document-header" data-hud="site-header">
        <a className="document-home-link" href={SITE_ROUTES.home}>
          <span className="document-home-name">{PROFILE.name}</span>
          <span className="document-home-role">{PROFILE.targetRole}</span>
        </a>

        <nav aria-label="Primary" data-hud="primary-nav">
          <ul className="document-nav">
            {SITE_NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="document-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="document-footer">
        <h2>Contact</h2>
        <ul>
          {PROFILE.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          {PROFILE.resumeUrl ? (
            <li>
              <a href={PROFILE.resumeUrl}>Download résumé (PDF)</a>
            </li>
          ) : null}
        </ul>
      </footer>
    </ResponsivePage>
  )
}
