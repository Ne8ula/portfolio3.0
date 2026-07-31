// Shared literal navigation for the server document and cockpit header.
// Labels/routes live here; the contact action is derived from the canonical
// profile so the two presentations cannot drift.

import { PROFILE } from '@/lib/portfolio/profile'
import type { PublicProfile } from '@/lib/portfolio/profile'
import { SITE_ROUTES } from '@/lib/site/site'

export type SiteNavKind = 'internal' | 'contact'

export type SiteNavItem = {
  readonly label: string
  readonly href: string
  readonly kind: SiteNavKind
}

export function deriveSiteNav(profile: PublicProfile): readonly SiteNavItem[] {
  const contact = profile.links.find((link) => link.kind === 'email')
  if (!contact || !contact.href.startsWith('mailto:')) {
    throw new Error('SITE_NAV requires a canonical email link')
  }

  return [
    {
      label: 'Projects',
      href: SITE_ROUTES.projects,
      kind: 'internal',
    },
    {
      label: 'About',
      href: SITE_ROUTES.about,
      kind: 'internal',
    },
    {
      label: 'Contact',
      href: contact.href,
      kind: 'contact',
    },
  ]
}

export const SITE_NAV = deriveSiteNav(PROFILE)
