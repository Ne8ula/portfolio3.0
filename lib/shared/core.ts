// Shared primitives for the strict contract/content modules (Phase 0 of
// docs/hud-responsive-layout-plan.md). This module is part of the strict
// enforcement island: no `@ts-nocheck`, no browser globals, no three.js.

/** A readonly string array guaranteed non-empty (§A.4.2). */
export type NonEmptyStrings = readonly [string, ...string[]]

/** JSON-serializable values — the only values allowed in canonical content. */
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonArray | JsonObject
export type JsonArray = readonly JsonValue[]
export type JsonObject = { readonly [key: string]: JsonValue }

/**
 * One finding from a pure validator.
 *
 * - `error`   — blocking: CI fails on it immediately (Phase 0 structural
 *               checks).
 * - `pending` — non-blocking gap that a later phase turns blocking
 *               (strict catalog completeness → Phase 0B; approval hashes →
 *               Phase 0B; route delivery assertions → Phase 2). Pending
 *               issues are reported, never hidden, and never counted as
 *               passing.
 */
export type ValidationIssue = {
  readonly severity: 'error' | 'pending'
  readonly subject: string
  readonly message: string
}

export function issue(subject: string, message: string): ValidationIssue {
  return { severity: 'error', subject, message }
}

export function pending(subject: string, message: string): ValidationIssue {
  return { severity: 'pending', subject, message }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** True for a plain object — the shape guard validators use so malformed
 *  nested values become structured issues instead of TypeErrors. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Non-narrowing variant of `isRecord` for values that already carry a
 *  compile-time type: filters runtime garbage without collapsing the typed
 *  view to `Record<string, unknown>`. */
export function hasRecordShape(value: unknown): boolean {
  return isRecord(value)
}

/**
 * Deep key-sorted JSON serialization. Used for the §A.4.2 approval hash so
 * the same content always produces the same bytes regardless of key order.
 * Throws on values JSON cannot represent (undefined, functions, NaN,
 * Infinity, bigint, circular references).
 */
export function stableStringify(value: JsonValue): string {
  return JSON.stringify(sortValue(value, new Set()))
}

function sortValue(value: JsonValue, seen: Set<object>): JsonValue {
  if (value === null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('stableStringify: non-finite number')
    return value
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value !== 'object') {
    throw new Error(`stableStringify: unsupported type ${typeof value}`)
  }
  if (seen.has(value)) throw new Error('stableStringify: circular reference')
  seen.add(value)
  try {
    if (Array.isArray(value)) {
      return (value as JsonArray).map((entry) => sortValue(entry, seen))
    }
    const out: Record<string, JsonValue> = {}
    for (const key of Object.keys(value).sort()) {
      const entry = (value as JsonObject)[key]
      if (entry === undefined) continue
      out[key] = sortValue(entry, seen)
    }
    return out
  } finally {
    seen.delete(value)
  }
}

/** True when `value` round-trips through JSON without loss of type. */
export function isJsonSerializable(value: unknown): boolean {
  try {
    stableStringify(value as JsonValue)
    return true
  } catch {
    return false
  }
}
