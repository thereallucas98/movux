import { expect, test } from '@playwright/test'

/**
 * F06 — Shift Editor.
 *
 * Register → onboarding → /settings/categories add "UTI" → /schedules → create
 * a DRAFT schedule with the DateRangePicker → click the schedule name link →
 * /schedules/[id] empty state visible → opens the Novo turno modal.
 *
 * Submitting the shift create form is a follow-up because driving the
 * DateTimeRangePicker (calendar + time inputs + Aplicar) deterministically
 * across browsers is brittle for CI.
 */
test.describe('/schedules/[scheduleId]', () => {
  test('navigates from schedules list to detail and opens shift form', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f06-shifts-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Shift Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F06 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F06 Unit')
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

    // Visit /schedules and create a DRAFT
    await page.goto('/schedules')
    await page.waitForURL(/\/schedules/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /^escalas$/i }),
    ).toBeVisible()
    await page.getByRole('button', { name: /^nova escala$/i }).click()
    await expect(
      page.getByRole('heading', { name: /^nova escala$/i }),
    ).toBeVisible()

    // Pick category
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: /uti/i }).click()

    // Open period picker, pick today and a few days later via day buttons
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

    // Empty state visible
    await expect(
      page.getByText(/crie o primeiro turno desta escala/i),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^criar primeiro turno$/i }),
    ).toBeVisible()

    // Open shift form
    await page
      .getByRole('button', { name: /^criar primeiro turno$/i })
      .click()
    await expect(
      page.getByRole('heading', { name: /^novo turno$/i }),
    ).toBeVisible()

    // Form fields visible
    await expect(page.getByText(/^categoria$/i).first()).toBeVisible()
    await expect(page.getByText(/^início e fim$/i).first()).toBeVisible()
    await expect(page.getByLabel(/^vagas$/i)).toBeVisible()
  })
})
