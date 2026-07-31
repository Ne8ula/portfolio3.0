// Consistency helpers deriving route metadata, JSON-LD, and the
// supplementary /portfolio.json representation from the canonical
// profile/catalog sources (§A.4.2). Pure functions over the STRICT types —
// Phase 2 wires them into routes; Phase 0 ships them with fixture-driven
// consistency tests so multiple presentations can never fork the facts.
//
// Rules encoded here:
//   - structured data must describe visible content; these helpers only
//     read canonical fields, never accept free-form extra facts;
//   - /portfolio.json is a discovery aid carrying canonical HTML URLs — it
//     never substitutes for visible HTML;
//   - approval metadata is never emitted.

import type { JsonObject } from '@/lib/shared/core'
import type { Project, ProjectLink } from '@/lib/projects/catalog'
import type { PublicProfile } from '@/lib/portfolio/profile'

export const PORTFOLIO_JSON_SCHEMA_VERSION = 1

export function projectCanonicalPath(slug: string): `/projects/${string}` {
  return `/projects/${slug}`
}

export function canonicalUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path === '/' ? '/' : path}`
}

export type RouteMetadata = {
  readonly title: string
  readonly description: string
  readonly canonical: string
}

export type ProjectLinkClassification = 'external' | 'self'

export function classifyProjectLink(
  link: ProjectLink,
  baseUrl: string,
): ProjectLinkClassification {
  return new URL(link.href).host === new URL(baseUrl).host ? 'self' : 'external'
}

export function deriveProjectMetadata(project: Project, baseUrl: string): RouteMetadata {
  return {
    title: `${project.title} — ${project.role}`,
    description: project.tagline,
    canonical: canonicalUrl(baseUrl, projectCanonicalPath(project.slug)),
  }
}

export function profileMetadataDescription(summary: string): string {
  const normalized = summary.trim()
  if (normalized.length <= 160) return normalized
  const firstSentence = /^[\s\S]*?[.!?](?=\s|$)/.exec(normalized)?.[0]
  return firstSentence ?? normalized
}

export function deriveProfileMetadata(
  profile: PublicProfile,
  baseUrl: string,
): RouteMetadata {
  return {
    title: `${profile.name} — ${profile.targetRole}`,
    description: profileMetadataDescription(profile.summary),
    canonical: canonicalUrl(baseUrl, '/'),
  }
}

export function deriveProjectsIndexMetadata(
  projects: readonly Project[],
  baseUrl: string,
): RouteMetadata {
  return {
    title: 'Projects',
    description: projects.map((project) => project.title).join(' · '),
    canonical: canonicalUrl(baseUrl, '/projects'),
  }
}

export function deriveAboutMetadata(
  profile: PublicProfile,
  baseUrl: string,
): RouteMetadata {
  return {
    title: `About — ${profile.name}`,
    description: profileMetadataDescription(profile.summary),
    canonical: canonicalUrl(baseUrl, '/about'),
  }
}

/** Schema.org Person for the profile/recruiter surfaces. */
export function derivePersonJsonLd(profile: PublicProfile, baseUrl: string): JsonObject {
  const person: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    description: profile.summary,
    jobTitle: profile.targetRole,
    knowsAbout: [...profile.capabilities],
    url: canonicalUrl(baseUrl, '/'),
    sameAs: profile.links
      .filter((link) => link.kind === 'linkedin' || link.kind === 'instagram' || link.kind === 'website')
      .map((link) => link.href),
  }
  if (profile.email !== undefined) person.email = `mailto:${profile.email}`
  return person as JsonObject
}

/** Schema.org CreativeWork for one project detail page. */
export function deriveProjectJsonLd(project: Project, baseUrl: string): JsonObject {
  const work: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    genre: project.category,
    dateCreated: project.date,
    creativeWorkStatus: project.status,
    url: canonicalUrl(baseUrl, projectCanonicalPath(project.slug)),
    keywords: [...project.skills],
  }
  if (project.cover.kind === 'image') {
    work.image = canonicalUrl(baseUrl, project.cover.src)
  }
  return work as JsonObject
}

/** Schema.org ItemList for the /projects catalog. */
export function deriveProjectsItemListJsonLd(
  projects: readonly Project[],
  baseUrl: string,
): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: project.title,
      url: canonicalUrl(baseUrl, projectCanonicalPath(project.slug)),
    })),
  } as unknown as JsonObject
}

/** Schema.org CollectionPage containing the same visible-order ItemList. */
export function deriveProjectsCollectionJsonLd(
  projects: readonly Project[],
  baseUrl: string,
): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Projects',
    url: canonicalUrl(baseUrl, '/projects'),
    mainEntity: deriveProjectsItemListJsonLd(projects, baseUrl),
  } as unknown as JsonObject
}

/**
 * The supplementary public JSON representation. Carries canonical HTML
 * URLs for every entity; consumers that ignore it lose nothing because the
 * visible HTML is complete (§A.4.2).
 */
export function derivePortfolioJson(
  profile: PublicProfile,
  projects: readonly Project[],
  baseUrl: string,
): JsonObject {
  return {
    schemaVersion: PORTFOLIO_JSON_SCHEMA_VERSION,
    canonical: canonicalUrl(baseUrl, '/'),
    profile: {
      name: profile.name,
      targetRole: profile.targetRole,
      summary: profile.summary,
      ...(profile.about !== undefined ? { about: [...profile.about] } : {}),
      capabilities: [...profile.capabilities],
      links: profile.links.map((link) => ({
        label: link.label,
        href: link.href,
        kind: link.kind,
      })),
      ...(profile.email !== undefined ? { email: profile.email } : {}),
      ...(profile.resumeUrl !== undefined ? { resumeUrl: profile.resumeUrl } : {}),
    },
    projects: projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      category: project.category,
      date: project.date,
      status: project.status,
      tagline: project.tagline,
      summary: project.summary,
      role: project.role,
      url: canonicalUrl(baseUrl, projectCanonicalPath(project.slug)),
    })),
  } as unknown as JsonObject
}
