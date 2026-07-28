// ESLint — scoped to the Phase 0 strict enforcement island (lib contracts,
// validators, scripts, tests, and the test-hooks bridge). The legacy
// cockpit modules are `@ts-nocheck` imperative three.js code and are NOT
// linted yet; coverage expands with the forbidden-pattern rules in Phase 8
// (docs/hud-responsive-layout-plan.md §A.7, §8).
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'components/cockpit/**',
      '!components/cockpit/test-hooks.ts',
      'app/**',
      '!app/layout-contract.ts',
      'References/**',
      '3DModels/**',
      'backend/**',
      'frontend/**',
      'frontend-ui/**',
      'database/**',
      'concepts/**',
      'screens/**',
      'public/**',
      'docs/**',
      'next.config.mjs',
      'postcss.config.mjs',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['lib/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts',
      'app/layout-contract.ts', 'components/cockpit/test-hooks.ts',
      'vitest.config.ts', 'playwright.config.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
    },
  },
)
