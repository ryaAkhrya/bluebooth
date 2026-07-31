import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile portrait', width: 390, height: 844 },
  { name: 'mobile landscape', width: 844, height: 390 },
  { name: 'tablet portrait', width: 768, height: 1024 },
] as const

test.describe('Phase 08 presentation', () => {
  for (const viewport of viewports) {
    test(`home remains usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')

      await expect(
        page.getByRole('heading', {
          name: 'A photobooth for two, wherever you are.',
        }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create a room/i }),
      ).toBeVisible()
      await expect(page.getByText(/result history/i)).toHaveCount(0)
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true)
    })
  }

  test('create-room form exposes keyboard validation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /create a room/i }).click()
    await page.getByRole('form', { name: /start your photobooth/i }).press('Enter')

    const name = page.getByRole('textbox', { name: /your name/i })
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Enter your name.')).toBeVisible()
  })
})
