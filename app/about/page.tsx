import type { Metadata } from 'next'
import type React from 'react'

import { DocumentShell } from '@/app/_components/document-shell'
import { JsonLd } from '@/app/_components/json-ld'
import {
  catalogueNumber,
  projectStatusLabel,
} from '@/app/_components/project-format'
import { toNextMetadata } from '@/app/_components/route-metadata'
import { ABOUT_LAYOUT_CONTRACT } from '@/app/about/layout-contract'
import {
  deriveAboutMetadata,
  derivePersonJsonLd,
} from '@/lib/content/serializers'
import { ABOUT_CONTENT_CONTRACT } from '@/lib/content/content-contracts'
import { PROFILE } from '@/lib/portfolio/profile'
import { PROJECTS } from '@/lib/projects/catalog'
import { SITE_URL } from '@/lib/site/site'

export const metadata: Metadata = toNextMetadata(
  deriveAboutMetadata(PROFILE, SITE_URL),
)

export default function AboutPage(): React.ReactElement {
  const aboutParagraphs = PROFILE.about ?? [PROFILE.summary]

  return (
    <DocumentShell
      contentContractId={ABOUT_CONTENT_CONTRACT.id}
      layoutContractId={ABOUT_LAYOUT_CONTRACT.id}
    >
      <JsonLd value={derivePersonJsonLd(PROFILE, SITE_URL)} />

      <header className="document-title about-intro">
        <p className="document-eyebrow">About</p>
        <h1>{PROFILE.name}</h1>
        <p className="about-role">{PROFILE.targetRole}</p>
        <div className="about-prose">
          {aboutParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </header>

      <section className="about-section" aria-labelledby="about-capabilities">
        <h2 id="about-capabilities">Capabilities</h2>
        <ul className="about-capabilities">
          {PROFILE.capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-evidence">
        <h2 id="about-evidence">Evidence</h2>
        <div className="about-projects">
          {PROJECTS.map((project, index) => (
            <article className="about-project" key={project.slug}>
              <p aria-hidden="true" className="catalogue-number">
                Project {catalogueNumber(index)}
              </p>
              <h3>
                <a href={`/projects/${project.slug}`}>{project.title}</a>
              </h3>
              <dl className="about-project-facts">
                <div>
                  <dt>Role</dt>
                  <dd>{project.role}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{project.date}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{projectStatusLabel(project.status)}</dd>
                </div>
              </dl>
              <h4>Outcomes</h4>
              <ul className="document-list">
                {project.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section about-contact" aria-labelledby="about-contact">
        <h2 id="about-contact">Contact</h2>
        <ul>
          {PROFILE.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          {PROFILE.resumeUrl ? (
            <li>
              <a className="document-action" href={PROFILE.resumeUrl}>
                Download résumé (PDF)
              </a>
            </li>
          ) : null}
        </ul>
      </section>
    </DocumentShell>
  )
}
