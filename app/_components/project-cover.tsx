import Image from 'next/image'
import type React from 'react'

import type { Project } from '@/lib/projects/catalog'

export function ProjectCover({
  priority = false,
  project,
}: {
  readonly priority?: boolean
  readonly project: Project
}): React.ReactElement {
  if (project.cover.kind === 'image') {
    return (
      <div className="project-cover">
        <Image
          alt={project.cover.alt}
          height={1200}
          priority={priority}
          sizes="(max-width: 1023px) 100vw, 40vw"
          src={project.cover.src}
          width={1200}
        />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="project-cover project-cover-generated"
      data-cover-alt={project.cover.alt}
    >
      <span className="project-cover-groove project-cover-groove-outer" />
      <span className="project-cover-groove project-cover-groove-inner" />
      <span className="project-cover-label" />
      <span className="project-cover-spindle" />
    </div>
  )
}
