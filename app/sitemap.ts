import type { MetadataRoute } from 'next'

import { canonicalUrl } from '@/lib/content/serializers'
import { PROJECTS } from '@/lib/projects/catalog'
import { SITE_ROUTES, SITE_URL } from '@/lib/site/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    SITE_ROUTES.home,
    SITE_ROUTES.projects,
    SITE_ROUTES.about,
    ...PROJECTS.map(
      (project) => `${SITE_ROUTES.projects}/${project.slug}` as const,
    ),
  ]

  return paths.map((path) => ({
    url: canonicalUrl(SITE_URL, path),
  }))
}
