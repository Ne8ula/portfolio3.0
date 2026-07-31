import { describe, expect, it } from 'vitest'

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { PROJECTS } from '@/lib/projects/catalog'
import { SITE_ROUTES, SITE_URL } from '@/lib/site/site'

describe('Phase 2 discovery surfaces', () => {
  it('lists exactly the canonical HTML routes in the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url)
    const expected = [
      SITE_ROUTES.home,
      SITE_ROUTES.projects,
      SITE_ROUTES.about,
      ...PROJECTS.map(
        (project) => `${SITE_ROUTES.projects}/${project.slug}`,
      ),
    ].map((path) => new URL(path, SITE_URL).href)

    expect(urls).toEqual(expected)
    expect(urls.some((url) => url.includes('/responsive-preview'))).toBe(false)
    expect(urls.some((url) => url.includes(SITE_ROUTES.recruiter))).toBe(false)
  })

  it('allows canonical content and advertises the sitemap', () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
      },
      sitemap: new URL('/sitemap.xml', SITE_URL).href,
    })
  })
})
