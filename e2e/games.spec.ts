import { expect, test } from '@playwright/test';
import { reset } from './support/fixtures';

test.beforeEach(async () => {
  await reset();
});

test('the game list shows Quiz and Memory Match as playable and Spot as coming', async ({ page }) => {
  await page.goto('/games');
  await expect(page.getByRole('link', { name: 'Play Quiz' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play Memory Match' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Spot the Differences, coming soon' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Spot the Differences/ })).toHaveCount(0);
});

test('ArrowRight moves to Memory Match and Enter opens it', async ({ page }) => {
  await page.goto('/games');
  await page.locator('.hm-view').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/games\/memory$/);
});

test('Spot the Differences cannot be opened', async ({ page }) => {
  await page.goto('/games');
  await page.locator('.hm-view').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/games$/);
  await page.getByRole('img', { name: 'Spot the Differences, coming soon' }).click({ force: true });
  await expect(page).toHaveURL(/\/games$/);
});
