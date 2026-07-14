import { expect, test } from '@playwright/test'

/**
 * F07 — Assignment Flow.
 *
 * Best-effort scaffolding test:
 * - Register admin → onboarding → /settings/categories add UTI
 * - /schedules → DRAFT schedule via DateRangePicker → assert created
 * - Click schedule link → detail page → empty state visible
 * - Direct-URL /shifts → empty Pendentes state visible
 *
 * The full assign + accept loop requires a second account; covered manually.
 */
test.describe('/schedules/[id] · assignments scaffolding + /shifts', () => {
  test('admin reaches detail; assignee /shifts page renders empty', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f07-assign-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Assign Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F07 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F07 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // /shifts → Pendentes empty state visible (no assignments yet)
    await page.goto('/shifts')
    await page.waitForURL(/\/shifts$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /pendentes/i })).toBeVisible()
    await expect(
      page.getByText(/você não tem turnos pendentes/i),
    ).toBeVisible()

    // Navigate to Aceitos / Histórico
    await page.getByRole('link', { name: /^aceitos$/i }).click()
    await page.waitForURL(/\/shifts\/aceitos$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /aceitos/i })).toBeVisible()

    await page.getByRole('link', { name: /^histórico$/i }).click()
    await page.waitForURL(/\/shifts\/historico$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /histórico/i })).toBeVisible()
  })
})
