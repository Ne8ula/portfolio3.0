export interface E2eRun {
  label: string
  args: string[]
}

export interface E2eRunnerOptions {
  args: string[]
  ci: string | undefined
  override: string | undefined
}

export interface E2eRunPlanOptions extends E2eRunnerOptions {
  specFiles: string[]
}

export interface E2eMainOptions {
  args?: string[]
  env?: Record<string, string | undefined>
  specFiles?: string[]
}

export function discoverE2eSpecFiles(root?: string): string[]

export function shouldIsolateE2eFiles(options: E2eRunnerOptions): boolean

export function planE2eRuns(options: E2eRunPlanOptions): E2eRun[]

export function main(options?: E2eMainOptions): number
