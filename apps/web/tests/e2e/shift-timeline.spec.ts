import { expect, test } from '@playwright/test'

/**
 * F11 — Shift Detail + Timeline.
 *
 * Smoke check that the new nested route at
 * /schedules/[scheduleId]/shifts/[shiftId] exists and is auth-gated.
 * Driving the full timeline interaction (creating a workspace, schedule,
 * shift, then adding a note) overlaps F02–F06 setup and is covered by
 * the API spec at apps/web/tests/api/shift-timeline.api.spec.ts.
 */
test.describe('/schedules/[scheduleId]/shifts/[shiftId]', () => {
  test('unauthenticated visit is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(
      '/schedules/00000000-0000-0000-0000-000000000000/shifts/00000000-0000-0000-0000-000000000000',
    )
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByRole('heading', { name: /fazer login/i }),
    ).toBeVisible()
  })
})
