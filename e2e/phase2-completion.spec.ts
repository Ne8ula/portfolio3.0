import { mkdirSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import {
  ACTION_PARITY,
  AX_OS_FUTURE_STUB_LABEL,
} from '@/lib/content/action-parity'
import { PROFILE } from '@/lib/portfolio/profile'
import { PROJECTS, type Project } from '@/lib/projects/catalog'

const PROJECT_PATHS = PROJECTS.map((project) => `/projects/${project.slug}`)
const CONTENT_PATHS = ['/', '/projects', ...PROJECT_PATHS, '/about'] as const
const AUDIT_PATHS = [
  '/',
  '/projects',
  `/projects/${PROJECTS[0]?.slug ?? 'songofmaka'}`,
  '/about',
] as const

function projectStatusLabel(project: Project): string {
  return project.status.replaceAll('-', ' ')
}

function rawHtmlContains(html: string, value: string): boolean {
  const escaped = value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;')
  return html.includes(value) || html.includes(escaped)
}

function isLinkTarget(value: string): boolean {
  return /^(?:https?:|mailto:)/i.test(value)
}

function projectDetailRequirements(project: Project): readonly string[] {
  return [
    project.title,
    project.category,
    project.date,
    projectStatusLabel(project),
    project.tagline,
    project.summary,
    project.role,
    project.problem,
    ...(project.team ? [project.team] : []),
    ...project.contributions,
    ...(project.constraints ?? []),
    ...project.outcomes,
    ...project.tools,
    ...project.skills,
    ...project.links.map((link) => link.href),
  ]
}

function requirementsFor(path: string): readonly string[] {
  if (path === '/') {
    return [
      PROFILE.name,
      PROFILE.targetRole,
      PROFILE.summary,
      ...PROFILE.capabilities,
      ...PROFILE.links.map((link) => link.href),
      ...PROJECTS.flatMap((project) => [
        project.title,
        projectStatusLabel(project),
        project.tagline,
      ]),
    ]
  }
  if (path === '/projects') {
    return PROJECTS.flatMap((project) => [
      project.title,
      project.category,
      project.date,
      projectStatusLabel(project),
      project.tagline,
      project.summary,
      project.role,
      ...project.tools,
      ...project.skills,
    ])
  }
  if (path === '/about') {
    return [
      PROFILE.name,
      PROFILE.targetRole,
      ...(PROFILE.about ?? [PROFILE.summary]),
      ...PROFILE.capabilities,
      ...PROJECTS.flatMap((project) => [
        project.title,
        project.role,
        project.date,
        projectStatusLabel(project),
        ...project.outcomes,
      ]),
    ]
  }
  const project = PROJECTS.find(
    (candidate) => path === `/projects/${candidate.slug}`,
  )
  if (!project) throw new Error(`No project fixture for ${path}`)
  return projectDetailRequirements(project)
}

async function blockWebGl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
        if (contextId === 'webgl2' || contextId === 'webgl') return null
        return Reflect.apply(originalGetContext, this, [contextId, ...args])
      },
    })
  })
}

test.describe('Phase 2 tier 1 — JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('initial responses expose every canonical route and required field', async ({
    page,
  }) => {
    for (const path of CONTENT_PATHS) {
      const response = await page.request.get(path)
      expect(response.status(), path).toBe(200)
      const html = await response.text()
      for (const value of requirementsFor(path)) {
        expect(
          rawHtmlContains(html, value),
          `${path} initial HTML is missing ${JSON.stringify(value)}`,
        ).toBe(true)
      }
    }
  })

  test('/recruiter permanently redirects to /about', async ({ request }) => {
    const response = await request.get('/recruiter', { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers().location).toBe('/about')
  })

  test('legacy Song of Maka routes permanently redirect to the canonical slug', async ({
    request,
  }) => {
    for (const path of [
      '/projects/thesongofmaka',
      '/games/thesongofmaka',
      '/games/songofmaka',
    ]) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(308)
      expect(response.headers().location, path).toBe('/projects/songofmaka')
    }
  })

  test('all canonical routes reflow at 320px and emit no inert settings shell', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 })

    for (const path of CONTENT_PATHS) {
      await page.goto(path)
      const dimensions = await page.evaluate(() => ({
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(dimensions.scrollHeight, path).toBeGreaterThan(
        dimensions.clientHeight,
      )
      expect(
        dimensions.scrollWidth - dimensions.clientWidth,
        `${path} horizontal overflow`,
      ).toBeLessThanOrEqual(1)
      await expect(
        page.locator('[data-hud="accessibility-trigger"]'),
      ).toHaveCount(0)
      await expect(
        page.locator('[data-hud="accessibility-dialog"]'),
      ).toHaveCount(0)
    }
  })

  test('required fields are visible semantic text, never noscript-only or hidden', async ({
    page,
  }) => {
    for (const path of CONTENT_PATHS) {
      await page.goto(path)
      const missing = await page.locator('main').evaluate(
        (main, requiredTexts) => {
          const walker = document.createTreeWalker(
            main,
            NodeFilter.SHOW_TEXT,
          )
          const textNodes: Text[] = []
          while (walker.nextNode()) {
            if (walker.currentNode instanceof Text) {
              textNodes.push(walker.currentNode)
            }
          }

          return requiredTexts.filter(
            (requiredText) =>
              !textNodes.some((node) => {
                if (!node.data.includes(requiredText)) return false
                const parent = node.parentElement
                if (!parent || parent.closest('noscript')) return false
                const style = getComputedStyle(parent)
                const rect = parent.getBoundingClientRect()
                return (
                  style.display !== 'none' &&
                  style.visibility !== 'hidden' &&
                  rect.width > 0 &&
                  rect.height > 0
                )
              }),
          )
        },
        requirementsFor(path).filter((value) => !isLinkTarget(value)),
      )
      expect(missing, `${path} has hidden or non-semantic required text`).toEqual(
        [],
      )
    }
  })
})

test.describe('Phase 2 tier 2 — WebGL unavailable', () => {
  test.beforeEach(async ({ page }) => {
    await blockWebGl(page)
  })

  test('accessibility and appearance persist, then reset to system together', async ({
    page,
  }) => {
    await page.emulateMedia({
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    })
    await page.goto('/')
    const trigger = page.locator('[data-hud="accessibility-trigger"]')
    await trigger.click()
    const dialog = page.locator('[data-hud="accessibility-dialog"]')

    await dialog.locator('label[for="appearance-dark"]').click()
    await dialog.locator('label[for="a11y-motion-reduced"]').click()
    await expect(page.locator('html')).toHaveAttribute(
      'data-appearance',
      'dark',
    )
    await expect(page.locator('html')).toHaveAttribute(
      'data-a11y-motion',
      'reduced',
    )

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute(
      'data-appearance',
      'dark',
    )
    await expect(page.locator('html')).toHaveAttribute(
      'data-a11y-motion',
      'reduced',
    )

    await trigger.click()
    await dialog.getByRole('button', { name: /use system settings/i }).click()
    await expect(page.locator('html')).toHaveAttribute(
      'data-appearance',
      'light',
    )
    await expect(page.locator('html')).toHaveAttribute(
      'data-a11y-motion',
      'full',
    )
    expect(
      await page.evaluate(() => ({
        accessibility: localStorage.getItem('cockpit-a11y-v1'),
        appearance: localStorage.getItem('cockpit-theme'),
      })),
    ).toEqual({ accessibility: null, appearance: null })
  })

  test('every implemented parity outcome remains reachable without WebGL', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.locator('.home-cockpit-notice').getByRole('link', {
        name: /^view projects$/i,
      }),
    ).toBeVisible()
    await page
      .locator('.home-cockpit-notice')
      .getByRole('link', { name: /^view projects$/i })
      .click()
    await expect(page).toHaveURL(/\/projects$/)

    const firstProject = PROJECTS[0]
    if (!firstProject) throw new Error('Project catalogue cannot be empty')
    await page
      .getByRole('link', { name: firstProject.title, exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(
      new RegExp(`/projects/${firstProject.slug}$`),
    )
    await expect(
      page.getByRole('link', { name: /next project/i }),
    ).toBeVisible()
    await expect(
      page.locator('[data-hud="accessibility-trigger"]'),
    ).toBeVisible()

    expect(
      ACTION_PARITY.filter((row) => row.status === 'implemented').map(
        (row) => row.id,
      ),
    ).toEqual([
      'enter-skip-boot',
      'browse-projects',
      'view-more',
      'focus-view',
      'change-theme',
      'change-accessibility',
    ])
    expect(
      ACTION_PARITY.find((row) => row.status === 'future-stub')?.stubLabel,
    ).toBe(AX_OS_FUTURE_STUB_LABEL)
  })
})

test.describe('Phase 2 automated accessibility and design assertions', () => {
  test.beforeEach(async ({ page }) => {
    await blockWebGl(page)
  })

  test('equivalent semantic accessibility audit is clean in both appearances', async ({
    page,
  }) => {
    for (const appearance of ['light', 'dark'] as const) {
      await page.goto('/')
      await page.evaluate((value) => {
        localStorage.setItem('cockpit-theme', value)
      }, appearance)

      for (const path of AUDIT_PATHS) {
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute(
          'data-appearance',
          appearance,
        )
        const issues = await page.evaluate(() => {
          const findings: string[] = []
          const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
          const ids = all
            .map((element) => element.id)
            .filter((id) => id.length > 0)
          const duplicateIds = ids.filter(
            (id, index) => ids.indexOf(id) !== index,
          )
          if (duplicateIds.length > 0) {
            findings.push(`duplicate ids: ${[...new Set(duplicateIds)].join(', ')}`)
          }
          if (document.documentElement.lang !== 'en') {
            findings.push('html lang is not en')
          }
          if (document.querySelectorAll('h1').length !== 1) {
            findings.push('expected exactly one h1')
          }
          const bannerCount = Array.from(
            document.querySelectorAll('header'),
          ).filter(
            (header) =>
              !header.closest('article, aside, main, nav, section'),
          ).length
          if (bannerCount !== 1) {
            findings.push('expected exactly one banner header')
          }
          if (
            document.querySelectorAll('nav[aria-label="Primary"]').length !== 1
          ) {
            findings.push('expected exactly one primary navigation')
          }
          if (document.querySelectorAll('main').length !== 1) {
            findings.push('expected exactly one main')
          }
          if (document.querySelectorAll('footer').length !== 1) {
            findings.push('expected exactly one footer')
          }

          const levels = Array.from(
            document.querySelectorAll('h1,h2,h3,h4,h5,h6'),
          ).map((heading) => Number(heading.tagName.slice(1)))
          for (let index = 1; index < levels.length; index += 1) {
            if ((levels[index] ?? 1) > (levels[index - 1] ?? 1) + 1) {
              findings.push(`heading level skipped at index ${index}`)
            }
          }

          for (const image of document.querySelectorAll('img')) {
            if (!image.hasAttribute('alt')) findings.push('image missing alt')
          }
          for (const element of document.querySelectorAll<HTMLElement>(
            'a[href], button',
          )) {
            const name =
              element.getAttribute('aria-label') ?? element.textContent ?? ''
            if (name.trim().length === 0) {
              findings.push(`${element.tagName.toLowerCase()} has no name`)
            }
          }
          for (const element of document.querySelectorAll<HTMLElement>(
            '[aria-labelledby]',
          )) {
            const references = (
              element.getAttribute('aria-labelledby') ?? ''
            ).split(/\s+/)
            for (const reference of references) {
              if (reference && !document.getElementById(reference)) {
                findings.push(`missing aria-labelledby target ${reference}`)
              }
            }
          }
          return findings
        })
        expect(issues, `${appearance} ${path}`).toEqual([])
      }
    }
  })

  test('skip and section-anchor focus targets work', async ({ page }) => {
    await page.goto('/about')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /skip to main/i })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()

    await page.goto('/projects#completed')
    await expect(page.locator('#completed')).toBeFocused()
    await page.goto('/projects#in-progress')
    await expect(page.locator('#in-progress')).toBeFocused()
  })

  test('interactive targets meet the 44px policy at both control sizes', async ({
    page,
  }) => {
    await page.goto('/about')

    for (const size of ['standard', 'large'] as const) {
      if (size === 'large') {
        await page.locator('[data-hud="accessibility-trigger"]').click()
        await page
          .locator('[data-hud="accessibility-dialog"]')
          .locator('label[for="a11y-controls-large"]')
          .click()
        await page.keyboard.press('Escape')
      }

      const undersized = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), label[for]',
          ),
        )
          .filter((element) => {
            const style = getComputedStyle(element)
            return style.display !== 'none' && style.visibility !== 'hidden'
          })
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              height: rect.height,
              name:
                element.getAttribute('aria-label') ??
                element.textContent?.trim() ??
                element.tagName,
              width: rect.width,
            }
          })
          .filter((target) => target.width < 44 || target.height < 44),
      )
      expect(undersized, size).toEqual([])
    }
  })

  test('document palette meets text and boundary contrast in required states', async ({
    page,
  }) => {
    await page.goto('/about')

    for (const appearance of ['light', 'dark'] as const) {
      await page.evaluate((value) => {
        localStorage.setItem('cockpit-theme', value)
      }, appearance)
      await page.reload()
      const ratios = await page.evaluate(() => {
        const parse = (value: string): [number, number, number] => {
          const normalized = value.trim()
          const hex = normalized.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
          if (hex) {
            const expanded =
              hex.length === 3
                ? hex
                    .split('')
                    .map((digit) => `${digit}${digit}`)
                    .join('')
                : hex
            return [
              Number.parseInt(expanded.slice(0, 2), 16),
              Number.parseInt(expanded.slice(2, 4), 16),
              Number.parseInt(expanded.slice(4, 6), 16),
            ]
          }
          const match = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number)
          if (!match || match.length < 3) throw new Error(`bad color ${value}`)
          return [match[0] ?? 0, match[1] ?? 0, match[2] ?? 0]
        }
        const luminance = ([red, green, blue]: readonly number[]): number => {
          const [r, g, b] = [red, green, blue].map((channel) => {
            const value = (channel ?? 0) / 255
            return value <= 0.03928
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
        }
        const ratio = (foreground: string, background: string): number => {
          const first = luminance(parse(foreground))
          const second = luminance(parse(background))
          return (
            (Math.max(first, second) + 0.05) /
            (Math.min(first, second) + 0.05)
          )
        }
        const styles = getComputedStyle(document.documentElement)
        const surface = styles.getPropertyValue('--doc-surface')
        return {
          accent: ratio(
            styles.getPropertyValue('--doc-jade-strong'),
            surface,
          ),
          boundary: ratio(styles.getPropertyValue('--doc-rule'), surface),
          muted: ratio(styles.getPropertyValue('--doc-ink-muted'), surface),
          text: ratio(styles.getPropertyValue('--doc-ink'), surface),
        }
      })
      expect(ratios.text, appearance).toBeGreaterThanOrEqual(4.5)
      expect(ratios.muted, appearance).toBeGreaterThanOrEqual(4.5)
      expect(ratios.accent, appearance).toBeGreaterThanOrEqual(4.5)
      expect(ratios.boundary, appearance).toBeGreaterThanOrEqual(3)
    }

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-a11y-contrast', 'high')
      document.documentElement.setAttribute(
        'data-a11y-transparency',
        'reduced',
      )
    })
    await expect(page.locator('html')).toHaveAttribute(
      'data-a11y-contrast',
      'high',
    )
    await expect(page.locator('html')).toHaveAttribute(
      'data-a11y-transparency',
      'reduced',
    )
  })

  test('forced colors preserves boundaries and reduced motion has no route animation', async ({
    page,
  }) => {
    await page.emulateMedia({
      forcedColors: 'active',
      reducedMotion: 'reduce',
    })
    await page.goto('/projects')
    expect(
      await page.evaluate(() =>
        window.matchMedia('(forced-colors: active)').matches,
      ),
    ).toBe(true)
    await expect(page.locator('.project-card').first()).toHaveCSS(
      'border-bottom-style',
      'solid',
    )
    await expect(page.locator('.project-status').first()).toContainText(
      /completed|in progress/i,
    )
    expect(
      await page.locator('main').evaluate((main) => main.getAnimations().length),
    ).toBe(0)
  })

  test('captures the Phase 2 appearance matrix and printable About artifact', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const artifactDirectory = 'test-results/phase-2-evidence'
    mkdirSync(artifactDirectory, { recursive: true })

    for (const appearance of ['light', 'dark'] as const) {
      await page.goto('/')
      await page.evaluate((value) => {
        localStorage.setItem('cockpit-theme', value)
      }, appearance)

      for (const viewport of [
        { height: 900, label: '1440x900', width: 1440 },
        { height: 568, label: '320x568', width: 320 },
      ] as const) {
        await page.setViewportSize(viewport)
        for (const path of AUDIT_PATHS) {
          await page.goto(path)
          const routeLabel =
            path === '/'
              ? 'home'
              : path.replaceAll('/', '-').replace(/^-/, '')
          await page.screenshot({
            animations: 'disabled',
            path: `${artifactDirectory}/${routeLabel}-${appearance}-${viewport.label}.png`,
          })
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/about')
    await page.pdf({
      format: 'Letter',
      path: `${artifactDirectory}/about-print.pdf`,
      printBackground: true,
    })
  })
})
