import type { ProjectStatus } from '@/lib/projects/catalog'

const SMALL_NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
] as const

export function catalogueNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export function projectStatusLabel(status: ProjectStatus): string {
  return status.replaceAll('-', ' ')
}

export function countWord(count: number): string {
  return SMALL_NUMBER_WORDS[count] ?? String(count)
}
