import { expect, test } from '@playwright/test'

/**
 * F12 — Notifications Center.
 *
 * Smoke check that the new /notifications route exists and is auth-gated.
 * The full inbox flow (register admin → assign colaborador → colab login →
 * see badge → mark read) is covered by the API spec at
 * apps/web/tests/api/notifications.api.spec.ts.
 */
test.describe('/notifications', () => {
  test('unauthenticated visit is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/notifications')
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByRole('heading', { name: /fazer login/i }),
    ).toBeVisible()
  })
})
