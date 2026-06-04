import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/EfficiencyMemo/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('sign-in page loads successfully', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })
})