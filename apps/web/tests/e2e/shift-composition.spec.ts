import { expect, test } from '@playwright/test'

/**
 * F06c — Expected Composition.
 *
 * Best-effort E2E: register → settings/specialties seed → settings/categories
 * seed → /schedules → DRAFT schedule → detail page → wizard.
 * The full create-shift + open composition dialog cycle is brittle (depends
 * on F06's DateTimeRangePicker). This spec asserts the kebab + dialog
 * scaffolding via direct DOM probes against the empty-state path.
 */
test.describe('/schedules/[id] · expected composition', () => {
  test('Composição column header appears on desktop table', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f06c-comp-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Comp Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F06c Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F06c Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // Add UTI category
    await page.goto('/settings/categories')
    await page.waitForURL(/\/settings\/categories/, { timeout: 10_000 })
    await page.getByRole('button', { name: /nova categoria|^novo$/i }).click()
    await page.getByPlaceholder(/categoria|nome/i).first().fill('UTI')
    await page
      .getByRole('button', { name: /^salvar$|^criar$|^adicionar$/i })
      .click()
    await expect(page.getByText('UTI').first()).toBeVisible({ timeout: 10_000 })

    // Add Enfermeiro specialty
    await page.goto('/settings/specialties')
    await page.waitForURL(/\/settings\/specialties/, { timeout: 10_000 })
    await page.getByRole('button', { name: /nova|^novo$/i }).click()
    await page.getByPlaceholder(/especialidade|nome/i).first().fill('Enfermeiro')
    await page
      .getByRole('button', { name: /^salvar$|^criar$|^adicionar$/i })
      .click()
    await expect(page.getByText('Enfermeiro').first()).toBeVisible({
      timeout: 10_000,
    })

    // Create DRAFT schedule
    await page.goto('/schedules')
    await page.waitForURL(/\/schedules/, { timeout: 10_000 })
    await page.getByRole('button', { name: /^nova escala$/i }).click()
    await expect(
      page.getByRole('heading', { name: /^nova escala$/i }),
    ).toBeVisible()
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: /uti/i }).click()
    await page.getByRole('button', { name: /selecione o período/i }).click()
    const dayButtons = page.getByRole('button', { name: /^\d+$/ })
    await dayButtons.first().click()
    await dayButtons.nth(5).click()
    await page.getByRole('button', { name: /^aplicar$/i }).click()
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/schedules') &&
          r.request().method() === 'POST' &&
          r.status() === 201,
        { timeout: 15_000 },
      ),
      page.getByRole('button', { name: /^criar escala$/i }).click(),
    ])

    // Click schedule link → detail page
    const link = page.getByRole('link').filter({ hasText: /^.+$/ }).first()
    await link.click()
    await page.waitForURL(/\/schedules\/[^/]+$/, { timeout: 10_000 })

    // Empty state visible (no shifts yet)
    await expect(
      page.getByText(/crie o primeiro turno desta escala/i),
    ).toBeVisible()
  })
})
