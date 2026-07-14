import { expect, test } from '@playwright/test'

/**
 * F03c — Member-Specialty Assignment.
 *
 * Asserts the page loads correctly with the new column wiring. Globally seeded
 * specialties for HOSPITAL vertical mean a fresh workspace already has ≥1
 * accessible specialty, so the empty-banner path is hard to exercise without
 * an OTHER-vertical workspace. The banner-visible test, the "Profissão"
 * column-header test, and the "self disabled with tooltip" test are documented
 * as follow-ups requiring more elaborate fixtures (2nd seeded user; OTHER
 * vertical workspace).
 */
test.describe('/settings/members (specialty column wiring)', () => {
  test('admin can navigate to /settings/members without errors', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f03c-nav-${suffix}@movux.test`

    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Spec Tester')
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

    await page.getByPlaceholder('Hospital Acme').fill('F03c Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F03c Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard\?ws=/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    await page.goto('/settings/members')
    await page.waitForURL(/\/settings\/members/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /membros do workspace/i }),
    ).toBeVisible()
    // Page rendered without crash; the new useTaxonomies-driven banner check
    // and Profissão column wiring did not break the existing F03a flow.
  })
})
