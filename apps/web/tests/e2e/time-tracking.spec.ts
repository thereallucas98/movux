import { expect, test } from '@playwright/test'

/**
 * F10 — Time Tracking.
 *
 * Best-effort scaffolding test:
 * - Register admin → onboarding → /time-tracking
 * - Empty state visible
 * - Filters render
 * - "Exportar CSV" button visible
 *
 * Two-account flow (A clock-in/out + admin closes) is manual.
 */
test.describe('/time-tracking · scaffolding', () => {
  test('admin reaches timesheet with filters and CSV button', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f10-tt-${suffix}@movux.test`

    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('TT Tester')
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

    await page.getByPlaceholder('Hospital Acme').fill('F10 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F10 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    await page.goto('/time-tracking')
    await page.waitForURL(/\/time-tracking/, { timeout: 10_000 })

    await expect(page.getByRole('heading', { name: /^ponto$/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /exportar csv/i }),
    ).toBeVisible()
    await expect(page.getByText(/^período$/i)).toBeVisible()
    await expect(
      page.getByLabel(/apenas pendentes de fechamento/i),
    ).toBeVisible()
    await expect(
      page.getByText(/nenhuma entrada para o período/i),
    ).toBeVisible()
  })
})
