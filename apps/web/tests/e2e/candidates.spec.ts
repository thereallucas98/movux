import { expect, test } from '@playwright/test'

/**
 * F08 — Open-for-Apply Queue.
 *
 * Best-effort scaffolding test:
 * - Register admin → onboarding → /shifts/abertos empty state visible
 * - Sub-tabs (Com vagas / Lista de espera) toggle works.
 *
 * Two-account flow (admin opens shift; user B applies; admin approves) is
 * covered manually because the test infra runs single-user.
 */
test.describe('/shifts/abertos · open-for-apply queue scaffolding', () => {
  test('renders empty state with sub-tabs', async ({ page }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f08-open-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Open Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F08 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F08 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // Direct-URL /shifts/abertos
    await page.goto('/shifts/abertos')
    await page.waitForURL(/\/shifts\/abertos$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /abertos/i })).toBeVisible()

    // Sub-tabs visible with counters (0/0)
    await expect(
      page.getByRole('tab', { name: /com vagas/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('tab', { name: /lista de espera/i }),
    ).toBeVisible()

    // Empty state for default "Com vagas"
    await expect(
      page.getByText(/nenhum turno aberto com vagas no momento/i),
    ).toBeVisible()

    // Switch to Lista de espera
    await page.getByRole('tab', { name: /lista de espera/i }).click()
    await expect(
      page.getByText(/nenhum turno em lista de espera/i),
    ).toBeVisible()
  })
})
