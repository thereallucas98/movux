import { expect, test } from '@playwright/test'

test.describe('/onboarding', () => {
  test('full happy path: register → tenant → workspace → skip → dashboard', async ({
    page,
  }) => {
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f02-onboard-${suffix}@movux.test`

    // 1. Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Onboard Tester')
    await page.getByPlaceholder('mail@exemplo.com').fill(email)
    const [pwd, confirm] = await page
      .getByPlaceholder('Digite sua senha')
      .all()
    await pwd.fill('testpassword')
    await confirm.fill('testpassword')
    await Promise.all([
      page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30_000 }),
      page.getByRole('button', { name: /^criar conta$/i }).click(),
    ])

    // The (app) layout redirects 0-workspace users to /onboarding.
    await page.waitForURL(/\/onboarding/, { timeout: 30_000 })

    // 2. Step 1 — create tenant
    await expect(
      page.getByRole('heading', { name: /crie sua organização/i }),
    ).toBeVisible()
    await page.getByPlaceholder('Hospital Acme').fill('Onboard Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()

    // 3. Step 2 — create workspace
    await expect(
      page.getByRole('heading', { name: /crie seu primeiro workspace/i }),
    ).toBeVisible()
    await page
      .getByPlaceholder('UTI - Unidade Centro')
      .fill('UTI Centro')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()

    // 4. Step 3 — skip
    await expect(
      page.getByRole('heading', { name: /convide sua equipe/i }),
    ).toBeVisible()
    await Promise.all([
      page.waitForURL(/\/dashboard\?ws=/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // 5. KPI labels visible (regression on F01)
    await expect(page.getByText(/turnos esta semana/i)).toBeVisible()
    await expect(page.getByText(/setores/i).first()).toBeVisible()
  })

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fonboarding/)
  })
})
