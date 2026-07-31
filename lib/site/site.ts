// Canonical site origin and route vocabulary for Phase 2. Pure and
// server-safe: metadata/discovery consumers share one URL resolver, while
// navigation and contracts share one set of route strings.

export type SiteUrlEnvironment = Readonly<{
  NODE_ENV?: string
  NEXT_PUBLIC_SITE_URL?: string
  VERCEL_PROJECT_PRODUCTION_URL?: string
}>

export const SITE_ROUTES = {
  home: '/',
  projects: '/projects',
  projectDetail: '/projects/[slug]',
  about: '/about',
  recruiter: '/recruiter',
  portfolioJson: '/portfolio.json',
} as const

export type SiteRoute = (typeof SITE_ROUTES)[keyof typeof SITE_ROUTES]

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function validateSiteUrl(value: string, nodeEnvironment = 'development'): string {
  if (value.endsWith('/')) {
    throw new Error('SITE_URL must not have a trailing slash')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`SITE_URL must be an absolute URL: "${value}"`)
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('SITE_URL must be an origin without credentials, path, query, or hash')
  }

  const localEnvironment =
    nodeEnvironment === 'development' || nodeEnvironment === 'test'
  if (parsed.protocol !== 'https:' && !localEnvironment) {
    throw new Error('SITE_URL must use https outside development')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('SITE_URL must use http or https')
  }

  return value
}

export function resolveSiteUrl(
  environment: SiteUrlEnvironment = process.env,
): string {
  const configured = configuredValue(environment.NEXT_PUBLIC_SITE_URL)
  const vercelProductionHost = configuredValue(
    environment.VERCEL_PROJECT_PRODUCTION_URL,
  )

  // Target domain: https://www.alexxiong.me (set NEXT_PUBLIC_SITE_URL at cutover).
  const candidate =
    configured ??
    (vercelProductionHost
      ? `https://${vercelProductionHost}`
      : 'http://localhost:3000')

  return validateSiteUrl(candidate, environment.NODE_ENV)
}

export const SITE_URL = resolveSiteUrl()
