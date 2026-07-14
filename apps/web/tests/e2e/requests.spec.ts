import { expect, test } from '@playwright/test'

/**
 * F09 — Request System.
 *
 * Best-effort scaffolding test:
 * - Register admin → onboarding → /requests → empty Pendentes state.
 * - Click "Novo pedido" → wizard step 1 (3 cards).
 * - Click "Solicitar folga" → form fields visible.
 * - Direct-URL /requests/inbox → empty inbox visible (admin reaches it).
 *
 * Two-account SWAP cycle (A pede, B aceita, admin aprova) is manual.
 */
test.describe('/requests · scaffolding', () => {
  test('opens wizard, picks TIME_OFF, and reaches Coord inbox', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.context().clearCookies()

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const email = `f09-req-${suffix}@movux.test`

    // Register
    await page.goto('/register')
    await page.getByPlaceholder('Seu nome completo').fill('Req Tester')
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
    await page.getByPlaceholder('Hospital Acme').fill('F09 Hospital')
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await page.getByPlaceholder('UTI - Unidade Centro').fill('F09 Unit')
    await page.getByRole('radio', { name: /hospital/i }).click()
    await page.getByRole('button', { name: /^próximo$/i }).click()
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
      page.getByRole('button', { name: /pular esta etapa/i }).click(),
    ])

    // /requests empty state
    await page.goto('/requests')
    await page.waitForURL(/\/requests$/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /meus pedidos/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/você não tem pedidos pendentes/i),
    ).toBeVisible()

    // Wizard
    await page.getByRole('button', { name: /^novo pedido$/i }).click()
    await expect(
      page.getByRole('heading', { name: /^novo pedido$/i }),
    ).toBeVisible()
    await page.getByRole('button', { name: /solicitar folga/i }).click()
    await expect(page.getByText(/^período$/i).first()).toBeVisible()
    await expect(page.getByText(/^motivo$/i).first()).toBeVisible()

    // Close wizard via back
    await page.getByRole('button', { name: /^voltar$/i }).click()

    // Inbox (admin should reach since onboarding makes them admin)
    await page.goto('/requests/inbox')
    await page.waitForURL(/\/requests\/inbox$/, { timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /inbox de aprovação/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/nenhum pedido aguardando aprovação/i),
    ).toBeVisible()
  })
})
