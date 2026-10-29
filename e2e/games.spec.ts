import { expect, test, type Page } from '@playwright/test';
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

/** The view takes focus in its mount effect, so a focused view means the page is hydrated and listens to keys. */
async function openGames(page: Page) {
  await page.goto('/games');
  await expect(page.locator('.hm-view')).toBeFocused();
}
const current = (page: Page, n: number) => expect(page.getByRole('button', { name: `Go to game ${n}` })).toHaveAttribute('aria-current', 'true');

test('ArrowRight moves to Memory Match and Enter opens it', async ({ page }) => {
  await openGames(page);
  await page.keyboard.press('ArrowRight');
  await current(page, 2);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/games\/memory$/);
});

test('Spot the Differences cannot be opened', async ({ page }) => {
  await openGames(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await current(page, 3);
  await expect(page.getByRole('button', { name: 'Next game' })).toBeDisabled();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  // Positive signal first: a later key is still handled by this page, so Enter/Space were processed and did nothing.
  await page.keyboard.press('ArrowLeft');
  await current(page, 2);
  await expect(page).toHaveURL(/\/games$/);
  await page.getByRole('img', { name: 'Spot the Differences, coming soon' }).click({ force: true });
  await page.keyboard.press('ArrowRight');
  await current(page, 3);
  await expect(page).toHaveURL(/\/games$/);
});

// the "?" pulses forever (hm-breathe), so Playwright never sees it as stable: click it with force
const memoryHelp = (page: Page) => page.getByRole('button', { name: 'What is Memory Match? Show how to play' });

test('the Memory Match "?" opens its tutorial; Esc closes it and returns focus; Play opens the game', async ({ page }) => {
  await openGames(page);
  await page.keyboard.press('ArrowRight');
  await current(page, 2);
  await memoryHelp(page).click({ force: true });
  const dialog = page.getByRole('dialog', { name: 'How to play Memory Match' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/games$/);
  // the popup owns the keys: arrows do not move the carousel, Esc does not leave the page
  await page.keyboard.press('ArrowRight');
  await current(page, 2);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(memoryHelp(page)).toBeFocused();
  await expect(page).toHaveURL(/\/games$/);

  await memoryHelp(page).click({ force: true });
  await page.getByRole('button', { name: 'Go to step 4' }).click();
  await dialog.getByRole('link', { name: 'Play Memory Match' }).click();
  await expect(page).toHaveURL(/\/games\/memory$/);
});

test('the Quiz "?" still opens its tutorial and Esc closes it', async ({ page }) => {
  await openGames(page);
  const help = page.getByRole('button', { name: 'What is Quiz? Show how to play' });
  await help.click({ force: true });
  const dialog = page.getByRole('dialog', { name: 'How to play Quiz' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/games$/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(help).toBeFocused();
  await expect(page).toHaveURL(/\/games$/);
});
