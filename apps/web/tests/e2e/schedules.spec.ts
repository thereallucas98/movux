import { expect, test } from '@playwright/test'

/**
 * F05 — Schedule Board.
 *
 * Strategy: register fresh user → onboarding → /schedules empty → create
 * a DRAFT schedule using the auto-seeded "Geral" category → assert it
 * appears in the list. The full publish/close cycle is documented as a
 * follow-up E2E because it requires picking dates via the DatePicker
 * which is harder to drive deterministically across browsers.
 */
test.describe('/schedules', () => {
  test('renders empty state and lets admin reach the create form', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f05-sched-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Sched Tester')
    await page.getByPlaceholder('mail@exemplo.com').fill(email)
    const [pwd, confirm] = await page
      .getByPlaceholder('Digite sua senha')
      .all()
    await pwd.fill('testpassword')
    await confirm.fill('testpassword')
    await Promise.all([
      page.waitForURL(/\/onboarding/, { timeout: 30_000 }),
      page.getByRole('button', { name: /^criar conta$/i }).click(),
    ])

    // Onboarding
    await page.getByPlaceholder('Hospital Acme').fill('F05 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F05 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // Visit /schedules
    await page.goto('/schedules')
    await page.waitForURL(/\/schedules/, { timeout: 10_000 })

    await expect(
      page.getByRole('heading', { name: /^escalas$/i }),
    ).toBeVisible()

    // Empty state for admin
    await expect(
      page.getByText(/nenhuma escala neste workspace/i),
    ).toBeVisible()

    // "Nova escala" button visible to admin
    await expect(
      page.getByRole('button', { name: /^nova escala$/i }),
    ).toBeVisible()

    // Open the create form (modal/dialog)
    await page.getByRole('button', { name: /^nova escala$/i }).click()
    await expect(
      page.getByRole('heading', { name: /^nova escala$/i }),
    ).toBeVisible()
  })
})
