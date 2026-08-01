export const STABILIZE_MS = 500
export const RESTORE_WAIT_MS = 10_000
export const AUTO_RESTORE_BUDGET = 2
export const READY_BUDGET_RESET_MS = 60_000

export type CockpitViewMode = 'cockpit' | 'monitor' | 'crate' | 'deck'

export type CockpitRestoreSnapshot = {
  readonly viewMode: CockpitViewMode
  readonly recordIndex: number | null
}

export type ContextLifecycleStatus =
  | 'initializing'
  | 'ready'
  | 'lost'
  | 'restoring'
  | 'terminal'

export type ContextLifecycleState = {
  readonly status: ContextLifecycleStatus
  /** Automatic rebuild attempts used inside the current 60-second budget window. */
  readonly autoRestoresUsed: number
  /** Monotonic successful-or-attempted keyed rebuild count for diagnostics. */
  readonly rebuildCount: number
}

export type ContextLifecycleAction =
  | { readonly type: 'frame-ready' }
  | { readonly type: 'context-lost' }
  | { readonly type: 'context-restored' }
  | { readonly type: 'restore-failed' }
  | { readonly type: 'restore-timeout' }
  | { readonly type: 'ready-budget-reset' }
  | { readonly type: 'manual-restart' }

export function createContextLifecycleState(): ContextLifecycleState {
  return {
    status: 'initializing',
    autoRestoresUsed: 0,
    rebuildCount: 0,
  }
}

/**
 * Pure WebGL context lifecycle.
 *
 * React owns timers and keyed remounts; this reducer owns only valid state
 * transitions and the bounded automatic-rebuild budget.
 */
export function reduceContextLifecycle(
  state: ContextLifecycleState,
  action: ContextLifecycleAction,
): ContextLifecycleState {
  switch (action.type) {
    case 'frame-ready':
      if (state.status !== 'initializing' && state.status !== 'restoring') return state
      return { ...state, status: 'ready' }

    case 'context-lost':
      if (state.status === 'terminal' || state.status === 'lost') return state
      if (state.autoRestoresUsed >= AUTO_RESTORE_BUDGET) {
        return { ...state, status: 'terminal' }
      }
      return { ...state, status: 'lost' }

    case 'context-restored':
      if (state.status !== 'lost') return state
      if (state.autoRestoresUsed >= AUTO_RESTORE_BUDGET) {
        return { ...state, status: 'terminal' }
      }
      return {
        status: 'restoring',
        autoRestoresUsed: state.autoRestoresUsed + 1,
        rebuildCount: state.rebuildCount + 1,
      }

    case 'restore-failed':
      if (state.status === 'initializing') {
        return { ...state, status: 'terminal' }
      }
      if (state.status !== 'restoring') return state
      if (state.autoRestoresUsed >= AUTO_RESTORE_BUDGET) {
        return { ...state, status: 'terminal' }
      }
      return {
        status: 'restoring',
        autoRestoresUsed: state.autoRestoresUsed + 1,
        rebuildCount: state.rebuildCount + 1,
      }

    case 'restore-timeout':
      return state.status === 'lost' ? { ...state, status: 'terminal' } : state

    case 'ready-budget-reset':
      if (state.status !== 'ready' || state.autoRestoresUsed === 0) return state
      return { ...state, autoRestoresUsed: 0 }

    case 'manual-restart':
      return state.status === 'terminal' ? createContextLifecycleState() : state
  }
}
