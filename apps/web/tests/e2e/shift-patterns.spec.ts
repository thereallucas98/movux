import { expect, test } from '@playwright/test'

/**
 * F06b — Shift Pattern Wizard.
 *
 * Register → onboarding → /settings/categories add "UTI" → create DRAFT
 * schedule → open detail → click "Gerar por padrão" → wizard step 1
 * (definition) → fill category + days + times → "Próximo" → step 2 (range)
 * visible. Submitting the full generation cycle is a follow-up because
 * driving the DateRangePicker + asserting toast is brittle.
 */
test.describe('/schedules/[id] · pattern wizard', () => {
  test('opens the wizard and advances from step 1 to step 2', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f06b-pattern-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Pattern Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F06b Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F06b Unit')
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

    // Open wizard
    await page.getByRole('button', { name: /gerar por padrão/i }).click()
    await expect(
      page.getByRole('heading', { name: /gerar turnos por padrão/i }),
    ).toBeVisible()
    await expect(page.getByText(/passo 1 de 2/i)).toBeVisible()

    // Pick category
    await page
      .getByRole('combobox')
      .filter({ hasText: /selecione uma categoria/i })
      .click()
    await page.getByRole('option', { name: /uti/i }).click()

    // "Dias úteis" preset
    await page.getByRole('button', { name: /^dias úteis$/i }).click()

    // Times
    await page.getByLabel(/^início$/i).fill('07:00')
    await page.getByLabel(/^fim$/i).fill('19:00')

    // Próximo
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await expect(page.getByText(/passo 2 de 2/i)).toBeVisible()
    await expect(page.getByText(/período de geração/i)).toBeVisible()

    // Voltar should still work
    await page.getByRole('button', { name: /^voltar$/i }).click()
    await expect(page.getByText(/passo 1 de 2/i)).toBeVisible()
  })
})
