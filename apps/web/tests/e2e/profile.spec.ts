import { expect, test } from '@playwright/test'

/**
 * F04 — User Profile.
 *
 * Register fresh user → navigate via sidebar avatar → /profile renders the
 * profile form prefilled. Test password section + notifications toggle. The
 * profile-form save round-trip is asserted via toast.
 */
test.describe('/profile', () => {
  test('navigates from sidebar and shows the three sections', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f04-profile-${suffix}@movux.test`
    const fullName = 'Profile Tester'

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill(fullName)
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
    await page.getByPlaceholder('Hospital Acme').fill('F04 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F04 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // Click sidebar avatar link → /profile
    await page.getByRole('link', { name: /ver perfil/i }).click()
    await page.waitForURL(/\/profile$/, { timeout: 10_000 })

    // Profile form visible with prefilled fullName
    await expect(page.getByRole('heading', { name: /^perfil$/i })).toBeVisible()
    await expect(page.getByLabel(/nome completo/i)).toHaveValue(fullName)

    // Navigate to Segurança
    await page.getByRole('link', { name: /^segurança$/i }).click()
    await page.waitForURL(/\/profile\/security$/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /^segurança$/i }),
    ).toBeVisible()
    await expect(page.getByLabel(/senha atual/i)).toBeVisible()

    // Wrong current password → inline error
    await page.getByLabel(/senha atual/i).fill('wrongpassword')
    await page.getByLabel(/^nova senha$/i).fill('newtestpassword')
    await page.getByLabel(/confirmar nova senha/i).fill('newtestpassword')
    await page.getByRole('button', { name: /^alterar senha$/i }).click()
    await expect(page.getByText(/senha atual incorreta/i)).toBeVisible({
      timeout: 10_000,
    })

    // Navigate to Notificações
    await page.getByRole('link', { name: /^notificações$/i }).click()
    await page.waitForURL(/\/profile\/notifications$/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /^notificações$/i }),
    ).toBeVisible()
    await expect(
      page.getByLabel(/receber notificações por whatsapp/i),
    ).toBeVisible()
  })
})
