import { expect, test } from '@playwright/test';
import { reset, signInAsAdmin } from './support/fixtures';

test.beforeEach(async () => {
  await reset();
});

test('the game list shows the Quiz card', async ({ page }) => {
  await page.goto('/games');
  await expect(page.getByRole('link', { name: 'Play Quiz' })).toBeVisible();
});

test('admin pages redirect to sign-in when signed out', async ({ page }) => {
  await page.goto('/admin/cards');
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test('after sign-in the sets page loads', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin/sets');
  await expect(page).toHaveURL(/\/admin\/sets$/);
});
