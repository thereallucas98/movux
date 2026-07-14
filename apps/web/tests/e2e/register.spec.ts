import { expect, test } from '@playwright/test'

test.describe('/register', () => {
  test('renders the register form with 4 fields', async ({ page }) => {
    await page.goto('/register')
    await expect(
      page.getByRole('heading', { name: /criar conta/i }),
    ).toBeVisible()
    await expect(page.getByPlaceholder('Seu nome completo')).toBeVisible()
    await expect(page.getByPlaceholder('mail@exemplo.com')).toBeVisible()
    // two password fields (senha + confirmar senha)
    await expect(page.getByPlaceholder('Digite sua senha')).toHaveCount(2)
    await expect(
      page.getByRole('button', { name: /criar conta/i }),
    ).toBeVisible()
  })

  test('shows password hint until an error appears', async ({ page }) => {
    await page.goto('/register')
    await expect(
      page.getByText(/a senha deve ter no mínimo 8 caracteres/i),
    ).toBeVisible()

    // Typing a too-short password swaps the hint for the error
    await page.getByPlaceholder('Digite sua senha').first().fill('123')
    await expect(
      page.getByText(/^mínimo 8 caracteres$/i).first(),
    ).toBeVisible()
  })

  test('flags password mismatch in real time and clears it when corrected', async ({
    page,
  }) => {
    await page.goto('/register')
    const [pwd, confirm] = await page.getByPlaceholder('Digite sua senha').all()

    await pwd.fill('abcdefgh')
    await confirm.fill('abcdefgX')

    await expect(page.getByText(/senhas não conferem/i)).toBeVisible()

    // Fix the mismatch — error must clear without submit
    await confirm.fill('abcdefgh')
    await expect(page.getByText(/senhas não conferem/i)).toHaveCount(0)
  })

  test('marks invalid fields with aria-invalid for the red border', async ({
    page,
  }) => {
    await page.goto('/register')
    const email = page.getByPlaceholder('mail@exemplo.com')
    await email.fill('abc')
    await expect(email).toHaveAttribute('aria-invalid', 'true')

    await email.fill('valid@example.com')
    await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('links back to login', async ({ page }) => {
    await page.goto('/register')
    await expect(
      page.getByRole('link', { name: /fazer login/i }),
    ).toHaveAttribute('href', '/login')
  })
})
