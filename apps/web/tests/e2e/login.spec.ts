import { expect, test } from '@playwright/test'

test.describe('/login', () => {
  test('renders the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('heading', { name: /fazer login/i }),
    ).toBeVisible()
    await expect(page.getByPlaceholder('mail@exemplo.com')).toBeVisible()
    await expect(page.getByPlaceholder('Digite sua senha')).toBeVisible()
    await expect(page.getByRole('button', { name: /^entrar$/i })).toBeVisible()
  })

  test('shows real-time validation errors on invalid input', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByPlaceholder('mail@exemplo.com').fill('not-an-email')
    await page.getByPlaceholder('Digite sua senha').fill('short')

    // onChange mode should surface errors before submit
    await expect(page.getByText(/email inválido/i)).toBeVisible()
    await expect(page.getByText(/mínimo 8 caracteres/i)).toBeVisible()
  })

  test('links to register and forgot-password', async ({ page }) => {
    await page.goto('/login')
    await expect(
      page.getByRole('link', { name: /criar conta/i }),
    ).toHaveAttribute('href', '/register')
    await expect(
      page.getByRole('link', { name: /recuperar senha/i }),
    ).toHaveAttribute('href', '/forgot-password')
  })
})
