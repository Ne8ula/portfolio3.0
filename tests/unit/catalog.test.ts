// Catalog tests — Phase 0B form: the canonical catalog carries the strict
// §A.4.2 schema (owner-approved records), validation is blocking, and the
// cockpit reads the derived SleeveRecord adapter which must carry no
// unique facts of its own.

import { describe, expect, it } from 'vitest'

import {
  catalogSlugs,
  PROJECTS,
  SLEEVES,
  sleeveRecord,
  type Project,
} from '@/lib/projects/catalog'
import { validateCatalogStructure } from '@/lib/projects/validation'
import { stableStringify, type JsonValue, type ValidationIssue } from '@/lib/shared/core'

function at<T>(list: readonly T[], index: number): T {
  const value = list[index]
  if (value === undefined) throw new Error(`missing index ${index}`)
  return value
}

function variant(patch: Record<string, unknown>): Project {
  return { ...at(PROJECTS, 0), ...patch } as unknown as Project
}

function hasError(issues: readonly ValidationIssue[], messagePart: string): boolean {
  return issues.some(
    (entry) => entry.severity === 'error' && entry.message.includes(messagePart),
  )
}

describe('canonical catalog', () => {
  it('passes strict blocking validation with zero issues', () => {
    expect(validateCatalogStructure(PROJECTS)).toEqual([])
  })

  it('keeps the six stable public slugs', () => {
    expect(catalogSlugs(PROJECTS)).toEqual([
      'songofmaka',
      'chuyuhong',
      'tencentgames',
      'nyuwelcome',
      'shanghainoir',
      'procgendungeon',
    ])
  })

  it('carries the owner-corrected canonical facts', () => {
    expect(at(PROJECTS, 0).title).toBe('Song of Maka') // no leading "The" (ledger #4)
    expect(at(PROJECTS, 0).tagline).toContain('their bird kingdom')
    expect(at(PROJECTS, 0).status).toBe('in-progress') // Maka: 2021–Present
    expect(at(PROJECTS, 2).date).toBe('2023') // Tencent (ledger #7)
    expect(at(PROJECTS, 4).status).toBe('in-progress') // Shanghai Noir
    expect(at(PROJECTS, 5).status).toBe('completed') // ProcGen (ledger #8)
  })

  it('canonical titles carry no artwork line breaks', () => {
    for (const project of PROJECTS) {
      expect(project.title).not.toContain('\n')
    }
  })

  it('honors the NDA decision: no publisher-deal mention on Chu Yu Hong', () => {
    const chuYuHong = at(PROJECTS, 1)
    const serialized = JSON.stringify(chuYuHong).toLowerCase()
    expect(serialized).not.toContain('publisher')
  })

  it('every record is JSON-serializable', () => {
    for (const project of PROJECTS) {
      expect(() => stableStringify(project as unknown as JsonValue)).not.toThrow()
    }
  })
})

describe('validateCatalogStructure — blocking on malformed records', () => {
  it('rejects an empty summary', () => {
    expect(
      hasError(validateCatalogStructure([variant({ summary: '' })]), '"summary" is empty'),
    ).toBe(true)
  })

  it('rejects a duplicate slug', () => {
    const issues = validateCatalogStructure([
      at(PROJECTS, 0),
      variant({ id: 'other', title: 'Other' }),
    ])
    expect(hasError(issues, 'duplicates project[0]')).toBe(true)
  })

  it('rejects a canonical title containing a line break', () => {
    expect(
      hasError(validateCatalogStructure([variant({ title: 'SONG\nOF MAKA' })]), 'line break'),
    ).toBe(true)
  })

  it('rejects an unrecognized status', () => {
    expect(
      hasError(validateCatalogStructure([variant({ status: 'shipped' })]), 'unrecognized status'),
    ).toBe(true)
  })

  it('rejects an empty contributions list and empty entries', () => {
    expect(
      hasError(
        validateCatalogStructure([variant({ contributions: [] })]),
        '"contributions" is empty',
      ),
    ).toBe(true)
    expect(
      hasError(validateCatalogStructure([variant({ outcomes: [''] })]), 'outcomes[0] is empty'),
    ).toBe(true)
  })

  it('rejects an unrecognized link kind and a non-https href', () => {
    const badKind = variant({ links: [{ label: 'X', href: 'https://x.example', kind: 'blog' }] })
    expect(hasError(validateCatalogStructure([badKind]), 'unrecognized link kind')).toBe(true)
    const badHref = variant({ links: [{ label: 'X', href: 'http://x.example', kind: 'live' }] })
    expect(
      hasError(validateCatalogStructure([badHref]), 'must be https:// or site-relative'),
    ).toBe(true)
  })

  it('rejects an image cover without meaningful alt text', () => {
    const cover = { kind: 'image', src: '/vinyl-covers/x.png', alt: '' }
    expect(hasError(validateCatalogStructure([variant({ cover })]), 'meaningful alt')).toBe(true)
  })

  it('rejects a generated cover that is not explicitly decorative', () => {
    const cover = { kind: 'generated', alt: '', decorative: false }
    expect(
      hasError(validateCatalogStructure([variant({ cover })]), 'explicitly decorative'),
    ).toBe(true)
  })

  it('rejects non-string/number visual tokens', () => {
    expect(
      hasError(validateCatalogStructure([variant({ visual: { bg: true } })]), 'visual.bg'),
    ).toBe(true)
  })

  it('returns structured issues, not TypeErrors, for malformed nested values', () => {
    expect(
      hasError(validateCatalogStructure([variant({ cover: undefined })]), 'cover must be an object'),
    ).toBe(true)
    expect(
      hasError(validateCatalogStructure([variant({ links: undefined })]), 'links must be an array'),
    ).toBe(true)
    expect(
      hasError(validateCatalogStructure([variant({ links: [null] })]), 'link must be an object'),
    ).toBe(true)
    expect(
      hasError(
        validateCatalogStructure([variant({ constraints: 'tight timeline' })]),
        'constraints must be an array',
      ),
    ).toBe(true)
    expect(
      hasError(validateCatalogStructure([variant({ visual: null })]), 'visual must be an object'),
    ).toBe(true)
    expect(
      hasError(
        validateCatalogStructure([null as unknown as Project]),
        'record must be an object',
      ),
    ).toBe(true)
  })
})

describe('sleeveRecord adapter (cockpit presentation, no unique facts)', () => {
  it('derives one sleeve per record', () => {
    expect(SLEEVES).toHaveLength(PROJECTS.length)
  })

  it('uses the authored art title and preserves the existing sleeve look', () => {
    expect(at(SLEEVES, 0).title).toBe('SONG\nOF MAKA')
    expect(at(SLEEVES, 0).date).toBe('2024') // dateLabel keeps the sleeve year
    expect(at(SLEEVES, 0).tools).toBe('Unity · Figma · Adobe')
    expect(at(SLEEVES, 0).bg).toBe('#E8E4DC')
  })

  it('shows WIP for in-progress records', () => {
    expect(at(SLEEVES, 4).date).toBe('WIP') // Shanghai Noir
  })

  it('maps a generated cover to null (motif fallback)', () => {
    expect(at(SLEEVES, 2).cover).toBeNull() // Tencent
    expect(at(SLEEVES, 0).cover).toBe('/vinyl-covers/song-of-maka.png')
  })

  it('falls back to canonical values when visual tokens are absent', () => {
    const bare = sleeveRecord({ ...at(PROJECTS, 0), visual: undefined })
    expect(bare.title).toBe('SONG OF MAKA') // uppercased canonical title
    expect(bare.date).toBe('WIP') // Maka is in-progress → WIP fallback
    expect(bare.tools).toBe(at(PROJECTS, 0).tools.join(' · '))
    const completed = sleeveRecord({ ...at(PROJECTS, 5), visual: undefined })
    expect(completed.date).toBe('2024') // canonical date passthrough (ProcGen)
  })
})
