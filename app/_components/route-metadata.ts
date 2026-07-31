import type { Metadata } from 'next'

import type { RouteMetadata } from '@/lib/content/serializers'

type SocialImage = {
  readonly alt: string
  readonly url: string
}

export function toNextMetadata(
  route: RouteMetadata,
  options: {
    readonly image?: SocialImage
    readonly type?: 'article' | 'website'
  } = {},
): Metadata {
  const image = options.image
  const images = image ? [{ alt: image.alt, url: image.url }] : undefined

  return {
    title: route.title,
    description: route.description,
    alternates: {
      canonical: route.canonical,
    },
    openGraph: {
      type: options.type ?? 'website',
      title: route.title,
      description: route.description,
      url: route.canonical,
      images,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: route.title,
      description: route.description,
      images,
    },
  }
}
