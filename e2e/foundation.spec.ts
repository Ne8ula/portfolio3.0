// Phase 1 foundation smoke (plan §8 Phase 1): representative page tiers,
// accessibility settings persistence, and the boot gate on the operable
// ACCESSIBILITY trigger. Chromium-only, mirroring e2e/smoke.spec.ts;
// the full browser/viewport matrix is Phase 8.

import { expect, test } from '@playwright/test'

test.describe('phase 1 foundation', () => {
  test('representative page demonstrates all three tiers', async ({ page }) => {
    await page.goto('/responsive-preview')
    const root = page.locator('[data-layout-contract="responsive-preview-v1"]')
    await expect(root).toBeVisible()

    // Default 1280×720 → normal.
    await expect(page.locator('[data-preview-tier]')).toHaveAttribute(
      'data-preview-tier',
      'normal',
    )
    await expect(page.locator('.responsive-stage')).toHaveAttribute('data-stage-mode', 'fit')

    // Below the normal threshold → zoom-narrow; the stage becomes a
    // contained pannable region while ordinary content reflows.
    await page.setViewportSize({ width: 800, height: 450 })
    await expect(page.locator('[data-preview-tier]')).toHaveAttribute(
      'data-preview-tier',
      'zoom-narrow',
    )
    const stage = page.locator('.responsive-stage')
    await expect(stage).toHaveAttribute('data-stage-mode', 'contained')
    // The contained surface keeps the designed minimum composition.
    const surface = page.locator('.responsive-stage-surface')
    const surfaceBox = await surface.boundingBox()
    expect(Math.round(surfaceBox?.width ?? 0)).toBe(1024)

    // Above the normal maximum → large (content scale capped, page centered).
    await page.setViewportSize({ width: 3840, height: 2160 })
    await expect(page.locator('[data-preview-tier]')).toHaveAttribute(
      'data-preview-tier',
      'large',
    )
  })

  test('reflow floor: content operable at 320px width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/responsive-preview')
    await expect(page.locator('h1')).toBeVisible()
    // No horizontal document overflow for ordinary content.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('accessibility dialog persists an explicit override across reload', async ({ page }) => {
    await page.goto('/responsive-preview')

    const trigger = page.locator('[data-hud="accessibility-trigger"]')
    await expect(trigger).toBeVisible()
    await trigger.click()

    const dialog = page.locator('[data-hud="accessibility-dialog"]')
    await expect(dialog).toBeVisible()

    // Focus containment wraps in both directions: initial focus lands on
    // the first radio, Shift+Tab moves to the last control, and Tab returns
    // to the first without escaping behind the modal.
    const firstControl = dialog.locator('#appearance-system')
    const lastControl = dialog.getByRole('button', { name: /^close$/i })
    await expect(firstControl).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(lastControl).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(firstControl).toBeFocused()

    // Every row shows a selected value — text/controls have no OS signal,
    // so their stored "system" state must present as Standard.
    await expect(dialog.locator('#a11y-text-standard')).toBeChecked()
    await expect(dialog.locator('#a11y-controls-standard')).toBeChecked()
    await expect(dialog.locator('#appearance-system')).toBeChecked()
    await expect(dialog.locator('#a11y-motion-system')).toBeChecked()

    // Explicit override: Motion → Reduced (users hit the visible label; the
    // radio itself is visually integrated behind it).
    await dialog.locator('label[for="a11y-motion-reduced"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'reduced')
    await expect(page.locator('[data-preview-state="reducedMotion"]')).toHaveAttribute(
      'data-active',
      'true',
    )

    // Escape closes and focus returns to the trigger.
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()

    // Persistence (tier 2): the pre-paint script re-stamps on reload.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'reduced')

    // USE SYSTEM SETTINGS resets to the system state.
    await trigger.click()
    await dialog.getByRole('button', { name: /use system settings/i }).click()
    await expect(page.locator('html')).toHaveAttribute('data-a11y-motion', 'full')
  })

  test('inline-controls alternative moves focus to its target', async ({ page }) => {
    await page.goto('/responsive-preview')
    const target = page.locator('#a11y-state-readout')
    await page
      .getByRole('link', { name: /jump to the accessibility state summary/i })
      .click()
    await expect(target).toBeFocused()
  })

  test.describe('JavaScript disabled (tier 1)', () => {
    test.use({ javaScriptEnabled: false })

    test('no inert settings control shell is emitted (§A.4.3)', async ({ page }) => {
      for (const path of ['/', '/responsive-preview']) {
        await page.goto(path)
        // The settings dialog is a tier-2 guarantee; without JavaScript
        // neither the trigger nor the dialog may exist as dead controls.
        await expect(page.locator('[data-hud="accessibility-trigger"]')).toHaveCount(0)
        await expect(page.locator('[data-hud="accessibility-dialog"]')).toHaveCount(0)
      }
    })
  })

  test('boot waits for the operable ACCESSIBILITY trigger and honors reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    // Trigger is reachable from boot (§A.6.1).
    await expect(page.locator('[data-hud="accessibility-trigger"]')).toBeVisible()

    // Reduced motion renders boot directly in its static ready state: the
    // confirm control is present without waiting out the ~6s timeline.
    await expect(page.locator('[data-hud="boot-enter"]')).toBeVisible({ timeout: 5_000 })

    // Settings are changeable BEFORE the cinematic (§A.4.3 tier 2).
    await page.locator('[data-hud="accessibility-trigger"]').click()
    await expect(page.locator('[data-hud="accessibility-dialog"]')).toBeVisible()
    await page.keyboard.press('Escape')

    // Entering skips the warp under reduced motion.
    await page.getByRole('button', { name: /enter the room/i }).click()
    await expect(page.locator('[data-layout-region="cockpit-stage"]')).toBeVisible({
      timeout: 30_000,
    })
  })
})
