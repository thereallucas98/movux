import { expect, test } from '@playwright/test'

test.describe('/dashboard', () => {
  test('unauthenticated visit is redirected to /login with redirectTo', async ({
    page,
  }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/)
    await expect(
      page.getByRole('heading', { name: /fazer login/i }),
    ).toBeVisible()
  })

  test('newly registered user with no workspace is routed to /onboarding (wizard)', async ({
    page,
  }) => {
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f01-dash-${suffix}@movux.test`

    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Dashboard Tester')
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

    // After register, the (app) layout redirects 0-workspace users to the
    // onboarding wizard rather than rendering an inline placeholder.
    await expect(
      page.getByRole('heading', { name: /crie sua organização/i }),
    ).toBeVisible({ timeout: 30_000 })
  })
})
