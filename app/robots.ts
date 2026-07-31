import type { MetadataRoute } from 'next'

import { canonicalUrl } from '@/lib/content/serializers'
import { SITE_URL } from '@/lib/site/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: canonicalUrl(SITE_URL, '/sitemap.xml'),
  }
}
