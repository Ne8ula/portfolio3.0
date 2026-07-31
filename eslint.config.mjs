// ESLint — the strict enforcement island plus Phase 2 server-import
// boundaries. Legacy cockpit runtime modules remain outside general lint
// coverage; app/** and lib/** may never pull them across the server-safe
// boundary.
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.agent-runs/**',
      'test-results/**',
      'playwright-report/**',
      // `dir/**` ignores the directory itself, which makes a `!dir/file`
      // re-include unreachable; `dir/*` ignores entries individually so the
      // negations below actually lint the two strict-island files.
      'components/cockpit/*',
      '!components/cockpit/cockpit-entry.tsx',
      '!components/cockpit/test-hooks.ts',
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
    files: [
      'lib/**/*.ts',
      'scripts/**/*.ts',
      'tests/**/*.ts',
      'e2e/**/*.ts',
      'app/**/*.{ts,tsx}',
      'components/cockpit/cockpit-entry.tsx',
      'components/cockpit/test-hooks.ts',
      'components/responsive/**/*.tsx',
      'vitest.config.ts',
      'playwright.config.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message: 'Server-safe app/lib modules must not import three.js.',
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message: 'Server-safe app/lib modules must not import three.js subpaths.',
            },
            {
              group: ['@/components/cockpit/*'],
              message: 'Server-safe app/lib modules must not import cockpit runtime modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/page.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message: 'The root Server Component must not import three.js.',
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message: 'The root Server Component must not import three.js subpaths.',
            },
            {
              group: [
                '@/components/cockpit/*',
                '!@/components/cockpit/cockpit-entry',
              ],
              message:
                'The root Server Component may import only the cockpit-entry client boundary.',
            },
          ],
        },
      ],
    },
  },
)
