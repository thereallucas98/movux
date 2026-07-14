import { expect, test } from '@playwright/test'

/**
 * F03b — Categories & Specialties CRUD.
 *
 * Reuses the F03a auth flow: register fresh user → onboarding wizard → settings.
 */
test.describe('/settings/(categories|specialties)', () => {
  test('admin can manage workspace categories and specialties', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f03b-tax-${suffix}@movux.test`

    // 1. Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Tax Tester')
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

    // 2. Onboarding
    await page.getByPlaceholder('Hospital Acme').fill('F03b Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F03b UTI Sul')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard\?ws=/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // 3. Categories
    await page.goto('/settings/categories')
    await page.waitForURL(/\/settings\/categories/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /^setores$/i }),
    ).toBeVisible()

    // Workspace has the auto-seeded "Geral" — regular Add button visible.
    await page.getByRole('button', { name: /adicionar setor/i }).click()
    await expect(
      page.getByRole('heading', { name: /^novo setor$/i }),
    ).toBeVisible()
    await page.getByPlaceholder('Ex.: UTI').fill('UTI Norte')
    await expect(page.getByText(/url:.*uti-norte/i)).toBeVisible()
    await page.getByRole('button', { name: /^adicionar$/i }).click()
    await expect(page.getByText(/^adicionado$/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByRole('cell', { name: /^uti norte$/i }),
    ).toBeVisible({ timeout: 10_000 })

    // 4. Specialties
    await page.goto('/settings/specialties')
    await page.waitForURL(/\/settings\/specialties/)
    await expect(
      page.getByRole('heading', { name: /^profissões$/i }),
    ).toBeVisible()

    // Specialties workspace section is empty → empty CTA visible.
    await page
      .getByRole('button', {
        name: /(criar primeira profissão|adicionar profissão)/i,
      })
      .click()
    await expect(
      page.getByRole('heading', { name: /^nova profissão$/i }),
    ).toBeVisible()
    await page.getByPlaceholder('Ex.: UTI').fill('Enfermeiro')
    await expect(page.getByText(/url:.*enfermeiro/i)).toBeVisible()
    await page.getByRole('button', { name: /^adicionar$/i }).click()
    await expect(page.getByText(/^adicionado$/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByRole('cell', { name: /^enfermeiro$/i }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
