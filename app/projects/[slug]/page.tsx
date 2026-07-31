import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type React from 'react'

import { DocumentShell } from '@/app/_components/document-shell'
import { JsonLd } from '@/app/_components/json-ld'
import {
  catalogueNumber,
  projectStatusLabel,
} from '@/app/_components/project-format'
import { ProjectCover } from '@/app/_components/project-cover'
import { toNextMetadata } from '@/app/_components/route-metadata'
import { PROJECT_DETAIL_LAYOUT_CONTRACT } from '@/app/projects/[slug]/layout-contract'
import {
  classifyProjectLink,
  deriveProjectJsonLd,
  deriveProjectMetadata,
} from '@/lib/content/serializers'
import { PROJECT_DETAIL_CONTENT_CONTRACT } from '@/lib/content/content-contracts'
import { catalogSlugs, PROJECTS, type Project } from '@/lib/projects/catalog'
import { SITE_URL } from '@/lib/site/site'

type ProjectPageProps = {
  readonly params: Promise<{ readonly slug: string }>
}

export const dynamicParams = false

export function generateStaticParams(): Array<{ slug: string }> {
  return catalogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params
  const project = PROJECTS.find((candidate) => candidate.slug === slug)
  if (!project) notFound()

  return toNextMetadata(deriveProjectMetadata(project, SITE_URL), {
    image:
      project.cover.kind === 'image'
        ? { alt: project.cover.alt, url: project.cover.src }
        : undefined,
    type: 'article',
  })
}

export default async function ProjectDetailPage({
  params,
}: ProjectPageProps): Promise<React.ReactElement> {
  const { slug } = await params
  const projectIndex = PROJECTS.findIndex(
    (candidate) => candidate.slug === slug,
  )
  const project = PROJECTS[projectIndex]
  if (!project) notFound()

  const previous = projectAtWrappedIndex(projectIndex - 1)
  const next = projectAtWrappedIndex(projectIndex + 1)
  const externalLinks = project.links.filter(
    (link) => classifyProjectLink(link, SITE_URL) === 'external',
  )

  return (
    <DocumentShell
      contentContractId={PROJECT_DETAIL_CONTENT_CONTRACT.id}
      layoutContractId={PROJECT_DETAIL_LAYOUT_CONTRACT.id}
    >
      <JsonLd value={deriveProjectJsonLd(project, SITE_URL)} />

      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/projects">Projects</a>
          </li>
          <li aria-current="page">{project.title}</li>
        </ol>
      </nav>

      <article className="project-detail">
        <header className="project-detail-header">
          <p aria-hidden="true" className="catalogue-number">
            Project {catalogueNumber(projectIndex)}
          </p>
          <h1>{project.title}</h1>
          <p className="project-tagline">{project.tagline}</p>
          <p className="project-metadata">
            <span>{project.category}</span>
            <span aria-hidden="true"> · </span>
            <span>{project.date}</span>
            <span aria-hidden="true"> · </span>
            <span className="project-status">
              <span aria-hidden="true" className="project-status-mark" />
              {projectStatusLabel(project.status)}
            </span>
            {project.team ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{project.team}</span>
              </>
            ) : null}
          </p>
        </header>

        <ProjectCover priority project={project} />

        <div className="project-detail-sections">
          <DetailSection heading="Overview">
            <p>{project.summary}</p>
          </DetailSection>
          <DetailSection heading="Problem">
            <p>{project.problem}</p>
          </DetailSection>
          <DetailSection heading="Role">
            <p>{project.role}</p>
          </DetailSection>
          <DetailSection heading="Contributions">
            <TextList values={project.contributions} />
          </DetailSection>
          {project.constraints ? (
            <DetailSection heading="Constraints">
              <TextList values={project.constraints} />
            </DetailSection>
          ) : null}
          <DetailSection heading="Outcomes">
            <TextList values={project.outcomes} />
          </DetailSection>
          <DetailSection heading="Tools and skills">
            <div className="project-tools-skills">
              <div>
                <h3>Tools</h3>
                <TextList values={project.tools} />
              </div>
              <div>
                <h3>Skills</h3>
                <TextList values={project.skills} />
              </div>
            </div>
          </DetailSection>
          {externalLinks.length > 0 ? (
            <DetailSection heading="Links">
              <ul className="external-links">
                {externalLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} rel="noopener">
                      {link.label}
                      <span> — external site</span>
                    </a>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
          <DetailSection heading="Next project">
            <div className="project-pagination">
              <a href={`/projects/${previous.slug}`}>
                <span>Previous project</span>
                <strong>{previous.title}</strong>
              </a>
              <a href={`/projects/${next.slug}`}>
                <span>Next project</span>
                <strong>{next.title}</strong>
              </a>
            </div>
          </DetailSection>
        </div>
      </article>
    </DocumentShell>
  )
}

function DetailSection({
  children,
  heading,
}: {
  readonly children: React.ReactNode
  readonly heading: string
}): React.ReactElement {
  const id = `section-${heading.toLowerCase().replaceAll(' ', '-')}`

  return (
    <section aria-labelledby={id} className="project-detail-section">
      <h2 id={id}>{heading}</h2>
      {children}
    </section>
  )
}

function TextList({
  values,
}: {
  readonly values: readonly string[]
}): React.ReactElement {
  return (
    <ul className="document-list">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  )
}

function projectAtWrappedIndex(index: number): Project {
  const wrappedIndex = (index + PROJECTS.length) % PROJECTS.length
  const project = PROJECTS[wrappedIndex]
  if (!project) {
    throw new Error('Project catalogue cannot be empty')
  }
  return project
}
