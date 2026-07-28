// Phase 0 catalog contract tests: structural validation is blocking (zero
// errors on the real catalog), strict completeness is pending-only, and
// helpers derive stable slugs/titles.

import { describe, expect, it } from 'vitest'

import {
  PROJECTS,
  catalogSlugs,
  projectDisplayTitle,
  projectSlug,
} from '@/lib/projects/catalog'
import type { ProvisionalProject } from '@/lib/projects/catalog'
import {
  validateCatalogCompleteness,
  validateCatalogStructure,
} from '@/lib/projects/validation'
import { stableStringify } from '@/lib/shared/core'
import type { JsonValue } from '@/lib/shared/core'

function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`missing item at index ${index}`)
  return item
}

function errorsOf(projects: readonly ProvisionalProject[]) {
  return validateCatalogStructure(projects).filter((i) => i.severity === 'error')
}

const EXPECTED_SLUGS = [
  'thesongofmaka',
  'chuyuhong',
  'tencentgames',
  'nyuwelcome',
  'shanghainoir',
  'procgendungeon',
]

describe('catalog helpers', () => {
  it('derives the six canonical slugs via catalogSlugs', () => {
    expect(catalogSlugs(PROJECTS)).toEqual(EXPECTED_SLUGS)
  })

  it('derives each slug via projectSlug', () => {
    expect(PROJECTS.map((project) => projectSlug(project))).toEqual(EXPECTED_SLUGS)
  })

  it('collapses sleeve-art line breaks in projectDisplayTitle', () => {
    expect(at(PROJECTS, 0).title).toBe('SONG\nOF MAKA')
    expect(projectDisplayTitle(at(PROJECTS, 0))).toBe('SONG OF MAKA')
  })
})

describe('validateCatalogStructure', () => {
  it('reports zero error issues for the real catalog', () => {
    expect(errorsOf(PROJECTS)).toEqual([])
  })

  it('errors on an empty tagline', () => {
    const broken = { ...at(PROJECTS, 0), tagline: '' }
    const errors = errorsOf([broken])
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((i) => i.message.includes('"tagline"'))).toBe(true)
  })

  it('errors on an http:// url', () => {
    const broken = { ...at(PROJECTS, 0), url: 'http://www.alexxiong.me/games/thesongofmaka' }
    const errors = errorsOf([broken])
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((i) => i.message.includes('https'))).toBe(true)
  })

  it('errors on a duplicate url', () => {
    const first = at(PROJECTS, 0)
    const duped = { ...at(PROJECTS, 1), url: first.url }
    const errors = errorsOf([first, duped])
    expect(errors.some((i) => i.message.includes('url duplicates'))).toBe(true)
  })

  it('errors on a bad hex color', () => {
    const broken = { ...at(PROJECTS, 0), bg: '#GGGGGG' }
    const errors = errorsOf([broken])
    expect(errors.some((i) => i.message.includes('bg'))).toBe(true)
  })

  it('errors on a cover outside /vinyl-covers/', () => {
    const broken = { ...at(PROJECTS, 0), cover: '/images/song-of-maka.png' }
    const errors = errorsOf([broken])
    expect(errors.some((i) => i.message.includes('cover'))).toBe(true)
  })

  it('errors on a duplicate display title', () => {
    const first = at(PROJECTS, 0)
    const duped = { ...at(PROJECTS, 1), title: 'SONG\nOF MAKA' }
    const errors = errorsOf([first, duped])
    expect(errors.some((i) => i.message.includes('title duplicates'))).toBe(true)
  })
})

describe('validateCatalogCompleteness', () => {
  it('reports only pending issues for the real catalog — never errors', () => {
    const issues = validateCatalogCompleteness(PROJECTS)
    expect(issues.every((i) => i.severity === 'pending')).toBe(true)
    expect(issues.filter((i) => i.severity === 'error')).toEqual([])
  })

  it('reports 6 projects x 10 strict fields = 60 pending gaps', () => {
    const issues = validateCatalogCompleteness(PROJECTS)
    expect(issues).toHaveLength(60)
  })
})

describe('catalog serializability', () => {
  it('every record survives stableStringify', () => {
    for (const project of PROJECTS) {
      expect(() => stableStringify(project as unknown as JsonValue)).not.toThrow()
    }
  })
})
