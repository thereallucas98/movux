import { expect, test } from '@playwright/test'

/**
 * F03a — Workspace Info & Members.
 *
 * Strategy: register a fresh user inside the test, complete the F02 onboarding
 * wizard, then exercise /settings as the freshly-minted ADMIN. Avoids
 * dependence on a pre-seeded password.
 */
test.describe('/settings (admin)', () => {
  test('admin can view info, edit name, switch tabs, and reject unknown invite', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f03a-settings-${suffix}@movux.test`

    // 1. Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Settings Tester')
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

    // 2. Onboarding wizard — tenant + workspace + skip
    await page.getByPlaceholder('Hospital Acme').fill('F03a Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()

    await page
      .getByPlaceholder('UTI - Unidade Centro')
      .fill('F03a UTI Sul')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()

    await Promise.all([
      page.waitForURL(/\/dashboard\?ws=/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // 3. Visit /settings → redirects to /settings/info
    await page.goto('/settings')
    await page.waitForURL(/\/settings\/info/, { timeout: 10_000 })

    const infoRegion = page.getByRole('region', {
      name: /informações do workspace/i,
    })
    await expect(infoRegion).toBeVisible()
    await expect(infoRegion.getByText('F03a UTI Sul')).toBeVisible()

    // 4. Edit workspace name
    await page.getByRole('button', { name: /editar/i }).click()
    const nameInput = page.getByLabel('Nome', { exact: true })
    await nameInput.fill('F03a UTI Sul — atualizado')
    await page.getByRole('button', { name: /^salvar$/i }).click()
    await expect(page.getByText(/workspace atualizado/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      infoRegion.getByText('F03a UTI Sul — atualizado'),
    ).toBeVisible()

    // 5. Switch to Membros tab — the freshly onboarded user is the only
    // member, so the panel shows the "invite people" empty state.
    await page.getByRole('link', { name: /membros/i }).click()
    await page.waitForURL(/\/settings\/members/, { timeout: 10_000 })
    await expect(
      page.getByText(/convide pessoas pelo formulário acima/i),
    ).toBeVisible()

    // 6. Add unknown email → inline error
    await page.getByRole('button', { name: /adicionar membro/i }).click()
    await page
      .getByLabel(/email do convidado/i)
      .fill('noone-f03a@nowhere.test')
    await page.getByRole('button', { name: /^adicionar$/i }).click()
    await expect(page.getByText(/usuário não encontrado/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})
