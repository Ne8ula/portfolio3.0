import { describe, expect, it } from 'vitest'

import {
  SITE_ROUTES,
  resolveSiteUrl,
  validateSiteUrl,
} from '@/lib/site/site'

describe('resolveSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL over the Vercel production alias', () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://www.alexxiong.me',
        VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.vercel.app',
      }),
    ).toBe('https://www.alexxiong.me')
  })

  it('uses the stable Vercel production alias when no custom origin is set', () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.vercel.app',
      }),
    ).toBe('https://portfolio.vercel.app')
  })

  it('uses localhost only for local development/test tooling', () => {
    expect(resolveSiteUrl({ NODE_ENV: 'development' })).toBe(
      'http://localhost:3000',
    )
    expect(resolveSiteUrl({ NODE_ENV: 'test' })).toBe('http://localhost:3000')
  })

  it('rejects a production http URL, trailing slash, and non-origin URL', () => {
    expect(() =>
      validateSiteUrl('http://example.com', 'production'),
    ).toThrow('https outside development')
    expect(() =>
      validateSiteUrl('https://example.com/', 'production'),
    ).toThrow('trailing slash')
    expect(() =>
      validateSiteUrl('https://example.com/path', 'production'),
    ).toThrow('must be an origin')
  })

  it('fails production resolution when no production origin is available', () => {
    expect(() => resolveSiteUrl({ NODE_ENV: 'production' })).toThrow(
      'https outside development',
    )
  })
})

describe('SITE_ROUTES', () => {
  it('pins the canonical and transitional Phase 2 route vocabulary', () => {
    expect(SITE_ROUTES).toEqual({
      home: '/',
      projects: '/projects',
      projectDetail: '/projects/[slug]',
      about: '/about',
      recruiter: '/recruiter',
      portfolioJson: '/portfolio.json',
    })
  })
})
