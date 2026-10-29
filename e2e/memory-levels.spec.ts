import { expect, test } from '@playwright/test';
import { makeCards, reset } from './support/fixtures';

const level = (page: import('@playwright/test').Page, n: number) => page.getByLabel(`${n} cards`);

test('8 active cards: only the 12-card level can be chosen', async ({ page }) => {
  await reset({ memory_cards: makeCards(8) });
  await page.goto('/games/memory');
  await expect(page.getByRole('link', { name: '12 cards' })).toBeVisible();
  await expect(page.getByRole('button', { name: '24 cards' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '30 cards' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /^(24|30) cards$/ })).toHaveCount(0);
});

test('15 active cards: all three levels can be chosen', async ({ page }) => {
  await reset({ memory_cards: makeCards(15) });
  await page.goto('/games/memory');
  for (const n of [12, 24, 30]) {
    await expect(page.getByRole('link', { name: `${n} cards` })).toHaveAttribute('href', `/games/memory/${n}`);
  }
});

test('no cards: a friendly picture screen, no level buttons', async ({ page }) => {
  await reset({ memory_cards: [] });
  await page.goto('/games/memory');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('[role="alert"]:not(next-route-announcer *)')).toHaveCount(0);
  await expect(level(page, 12)).toHaveCount(0);
});

test('keyboard only: Right then Enter reaches the 24-card level', async ({ page }) => {
  await reset({ memory_cards: makeCards(15) });
  await page.goto('/games/memory');
  // the page focuses the first level once it has loaded; waiting for it means keys are not lost before hydration
  await expect(page.getByRole('link', { name: '12 cards' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('link', { name: '24 cards' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/games\/memory\/24$/);
});

test('keyboard only: Enter on the first level reaches /games/memory/12', async ({ page }) => {
  await reset({ memory_cards: makeCards(15) });
  await page.goto('/games/memory');
  await expect(page.getByRole('link', { name: '12 cards' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/games\/memory\/12$/);
});
