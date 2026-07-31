import type { Metadata } from 'next'
import type React from 'react'

import { DocumentShell } from '@/app/_components/document-shell'
import { JsonLd } from '@/app/_components/json-ld'
import {
  catalogueNumber,
  countWord,
  projectStatusLabel,
} from '@/app/_components/project-format'
import { ProjectCover } from '@/app/_components/project-cover'
import { toNextMetadata } from '@/app/_components/route-metadata'
import { PROJECTS_INDEX_LAYOUT_CONTRACT } from '@/app/projects/layout-contract'
import {
  deriveProjectsCollectionJsonLd,
  deriveProjectsIndexMetadata,
} from '@/lib/content/serializers'
import { PROJECTS_INDEX_CONTENT_CONTRACT } from '@/lib/content/content-contracts'
import { PROJECTS, type Project } from '@/lib/projects/catalog'
import { SITE_URL } from '@/lib/site/site'

const PROJECT_ENTRIES = PROJECTS.map((project, index) => ({ index, project }))
const COMPLETED_PROJECTS = PROJECT_ENTRIES.filter(
  ({ project }) => project.status === 'completed',
)
const IN_PROGRESS_PROJECTS = PROJECT_ENTRIES.filter(
  ({ project }) => project.status === 'in-progress',
)
const VISIBLE_PROJECTS = [
  ...COMPLETED_PROJECTS,
  ...IN_PROGRESS_PROJECTS,
].map(({ project }) => project)

export const metadata: Metadata = toNextMetadata(
  deriveProjectsIndexMetadata(PROJECTS, SITE_URL),
)

export default function ProjectsPage(): React.ReactElement {
  const total = countWord(PROJECTS.length)
  const completed = countWord(COMPLETED_PROJECTS.length)
  const inProgress = countWord(IN_PROGRESS_PROJECTS.length)
  const countSummary = `${total.charAt(0).toUpperCase()}${total.slice(1)} projects — ${completed} completed, ${inProgress} in progress.`

  return (
    <DocumentShell
      contentContractId={PROJECTS_INDEX_CONTENT_CONTRACT.id}
      layoutContractId={PROJECTS_INDEX_LAYOUT_CONTRACT.id}
    >
      <JsonLd value={deriveProjectsCollectionJsonLd(VISIBLE_PROJECTS, SITE_URL)} />

      <header className="document-title">
        <p className="document-eyebrow">Catalogue</p>
        <h1>Projects</h1>
        <p className="projects-count">{countSummary}</p>
      </header>

      <ProjectSection
        entries={COMPLETED_PROJECTS}
        heading="Completed"
        id="completed"
      />
      <ProjectSection
        entries={IN_PROGRESS_PROJECTS}
        heading="In progress"
        id="in-progress"
      />
    </DocumentShell>
  )
}

function ProjectSection({
  entries,
  heading,
  id,
}: {
  readonly entries: ReadonlyArray<{ readonly index: number; readonly project: Project }>
  readonly heading: string
  readonly id: string
}): React.ReactElement {
  return (
    <section className="projects-section" aria-labelledby={id}>
      <h2 id={id} tabIndex={-1}>
        {heading}
      </h2>
      <div className="projects-list">
        {entries.map(({ index, project }) => (
          <article
            className="project-card"
            id={`project-${project.slug}`}
            key={project.slug}
          >
            <ProjectCover priority={index === 0} project={project} />

            <div className="project-card-copy">
              <p aria-hidden="true" className="catalogue-number">
                Project {catalogueNumber(index)}
              </p>
              <h3>
                <a href={`/projects/${project.slug}`}>{project.title}</a>
              </h3>
              <p className="project-metadata">
                <span>{project.category}</span>
                <span aria-hidden="true"> · </span>
                <span>{project.date}</span>
                <span aria-hidden="true"> · </span>
                <span className="project-status">
                  <span aria-hidden="true" className="project-status-mark" />
                  {projectStatusLabel(project.status)}
                </span>
              </p>
              <p className="project-tagline">{project.tagline}</p>
              <p>{project.summary}</p>
              <dl className="project-facts">
                <div>
                  <dt>Role</dt>
                  <dd>{project.role}</dd>
                </div>
              </dl>
              <div className="project-compact-list">
                <span>Tools</span>
                <ul>
                  {project.tools.map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </div>
              <div className="project-compact-list">
                <span>Skills</span>
                <ul>
                  {project.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
              <a className="document-action" href={`/projects/${project.slug}`}>
                View project
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
