import type React from 'react'

import type { JsonObject } from '@/lib/shared/core'

export function JsonLd({ value }: { readonly value: JsonObject }): React.ReactElement {
  const serialized = JSON.stringify(value).replaceAll('<', '\\u003c')

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  )
}
