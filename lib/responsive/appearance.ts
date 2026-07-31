// Document appearance preference model (Phase 2 Step 1). Pure — browser
// signals and storage are supplied by callers so resolution and the
// pre-paint naming contract stay unit-testable.

export type AppearanceSetting = 'system' | 'light' | 'dark'
export type ResolvedAppearance = 'light' | 'dark'

/** Existing cockpit key; Phase 2 deliberately keeps it stable. */
export const APPEARANCE_STORAGE_KEY = 'cockpit-theme'
export const APPEARANCE_ATTRIBUTE = 'data-appearance'
export const APPEARANCE_EVENT = 'cockpit-theme'

export function parseStoredAppearance(value: unknown): AppearanceSetting {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveAppearance(
  setting: AppearanceSetting,
  systemPrefersDark: boolean,
): ResolvedAppearance {
  if (setting === 'light' || setting === 'dark') return setting
  return systemPrefersDark ? 'dark' : 'light'
}

export function appearanceAttributeValue(
  setting: AppearanceSetting,
  systemPrefersDark: boolean,
): Readonly<Record<typeof APPEARANCE_ATTRIBUTE, ResolvedAppearance>> {
  return {
    [APPEARANCE_ATTRIBUTE]: resolveAppearance(setting, systemPrefersDark),
  }
}
