import { COCKPIT_LAYOUT_CONTRACT } from '@/app/layout-contract'
import { CockpitEntry } from '@/components/cockpit/cockpit-entry'
import { HOME_CONTENT_CONTRACT } from '@/lib/content/content-contracts'
import { PROFILE } from '@/lib/portfolio/profile'
import { PROJECTS } from '@/lib/projects/catalog'
import { SITE_NAV } from '@/lib/site/navigation'
import { SITE_ROUTES } from '@/lib/site/site'

function projectStatusLabel(status: string): string {
  return status.replaceAll('-', ' ')
}

export default function Home() {
  const contact = SITE_NAV.find((item) => item.kind === 'contact')
  const nameParts = PROFILE.name.split(/\s+/)
  const familyName = nameParts.at(-1) ?? PROFILE.name

  return (
    <div
      className="home-shell"
      data-layout-region="app-shell"
      data-layout-contract={COCKPIT_LAYOUT_CONTRACT.id}
      data-content-contract={HOME_CONTENT_CONTRACT.id}
    >
      <a className="home-skip-link" data-hud="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="home-header">
        <div
          className="home-identity-lockup"
          aria-label={`${PROFILE.name} studio`}
        >
          <span aria-hidden className="home-identity-initial">
            {PROFILE.name.charAt(0)}
          </span>
          <span aria-hidden className="home-identity-rule">
            ·
          </span>
          <span aria-hidden className="home-identity-name">
            {familyName}
          </span>
          <span aria-hidden className="home-identity-studio">
            studio
          </span>
        </div>

        <nav aria-label="Primary" data-hud="primary-nav">
          <ul className="home-primary-nav">
            {SITE_NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
            {PROFILE.resumeUrl ? (
              <li>
                <a href={PROFILE.resumeUrl}>Résumé (PDF)</a>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>

      <main id="main" className="home-main" tabIndex={-1}>
        <section className="home-intro" aria-labelledby="home-title">
          <p className="home-eyebrow">Portfolio manifest</p>
          <h1 id="home-title">{PROFILE.name}</h1>
          <p className="home-role">{PROFILE.targetRole}</p>
          <p className="home-summary">{PROFILE.summary}</p>
        </section>

        <section className="home-capabilities" aria-labelledby="capabilities-title">
          <h2 id="capabilities-title">Capabilities</h2>
          <ul>
            {PROFILE.capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </section>

        <div className="home-primary-actions" role="group" aria-label="Portfolio actions">
          <a className="home-action-primary" href={SITE_ROUTES.projects}>
            View projects
          </a>
          <a href={SITE_ROUTES.about}>About</a>
          {contact ? <a href={contact.href}>Contact</a> : null}
        </div>

        <section className="home-catalogue" aria-labelledby="catalogue-title">
          <div className="home-section-heading">
            <p className="home-eyebrow">Directory</p>
            <h2 id="catalogue-title">Project catalogue</h2>
          </div>
          <ol>
            {PROJECTS.map((project, index) => (
              <li key={project.slug}>
                <article>
                  <span aria-hidden className="home-catalogue-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="home-catalogue-record">
                    <h3>
                      <a href={`${SITE_ROUTES.projects}/${project.slug}`}>
                        {project.title}
                      </a>
                    </h3>
                    <p className="home-project-meta">
                      {project.category}
                      <span> · </span>
                      {project.date}
                      <span> · </span>
                      {projectStatusLabel(project.status)}
                    </p>
                    <p>{project.tagline}</p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <noscript>
          <p className="home-noscript-notice">
            The 3D cockpit needs JavaScript; everything on this site is available as
            ordinary pages. <a href={SITE_ROUTES.projects}>View projects</a> or visit{' '}
            <a href={SITE_ROUTES.about}>About</a>.
          </p>
        </noscript>
      </main>

      <footer className="home-footer">
        <h2>Contact</h2>
        <ul>
          {PROFILE.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          {PROFILE.resumeUrl ? (
            <li>
              <a href={PROFILE.resumeUrl}>Résumé (PDF)</a>
            </li>
          ) : null}
        </ul>
      </footer>

      <CockpitEntry />
    </div>
  )
}
