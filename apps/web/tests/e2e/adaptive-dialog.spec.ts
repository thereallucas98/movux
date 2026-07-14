import { expect, test } from '@playwright/test'

test.describe('AdaptiveDialog demo', () => {
  test('opens a sheet on mobile and a dialog on desktop', async ({
    page,
    viewport,
  }) => {
    await page.goto('/adaptive-dialog-demo')
    await page.getByTestId('open-demo').click()

    // Wait for either the sheet or dialog content to appear
    const sheetContent = page.locator('[data-slot="sheet-content"]')
    const dialogContent = page.locator('[role="dialog"]').first()

    const width = viewport?.width ?? 0

    if (width <= 720) {
      await expect(sheetContent).toBeVisible()
    } else {
      // The Dialog component from shadcn uses role="dialog" on its content.
      await expect(dialogContent).toBeVisible()
    }

    await expect(page.getByTestId('demo-body')).toBeVisible()
    await expect(page.getByText('Demo title')).toBeVisible()
  })
})
