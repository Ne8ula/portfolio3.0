import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({
  overrideConfigFile: fileURLToPath(
    new URL('../../eslint.config.mjs', import.meta.url),
  ),
})

async function restrictedMessages(
  source: string,
  filePath: string,
): Promise<readonly string[]> {
  const [result] = await eslint.lintText(source, { filePath })
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message)
}

describe('Phase 2 server import boundary', () => {
  it('rejects three.js and cockpit runtime imports under app/**', async () => {
    const messages = await restrictedMessages(
      [
        "import * as THREE from 'three'",
        "import { makeDiscTexture } from '@/components/cockpit/project-textures'",
        "import { CockpitApp } from '@/components/cockpit/cockpit-app'",
      ].join('\n'),
      'app/projects/import-probe.ts',
    )

    expect(messages).toHaveLength(3)
  })

  it('rejects cockpit runtime imports under lib/**', async () => {
    const messages = await restrictedMessages(
      "import { CockpitApp } from '@/components/cockpit/cockpit-app'",
      'lib/import-probe.ts',
    )

    expect(messages).toHaveLength(1)
  })

  it('allows app/page.tsx to import only cockpit-entry', async () => {
    expect(
      await restrictedMessages(
        "import { CockpitEntry } from '@/components/cockpit/cockpit-entry'",
        'app/page.tsx',
      ),
    ).toEqual([])

    expect(
      await restrictedMessages(
        "import { CockpitApp } from '@/components/cockpit/cockpit-app'",
        'app/page.tsx',
      ),
    ).toHaveLength(1)
  })
})
