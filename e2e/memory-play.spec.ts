import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeCards, reset } from './support/fixtures';

const COLS = 4; // level 12 is a 4x3 grid

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('console', (m) => {
    // the app has no favicon yet (not part of this screen); every other console error fails the test
    if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(`${m.text()} @ ${m.location().url}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await reset({ memory_cards: makeCards(6) });
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** Opens the 12-card board, waits for hydration (first tile focused) and reads the card id of every tile. */
async function openBoard(page: Page): Promise<{ tiles: Locator; ids: string[]; pairs: [number, number][] }> {
  await page.goto('/games/memory/12');
  const tiles = page.locator('[data-tile]');
  await expect(tiles.first()).toBeFocused();
  await expect(tiles).toHaveCount(12);
  const ids = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-card-id') ?? ''));
  const byId = new Map<string, number[]>();
  ids.forEach((id, i) => byId.set(id, [...(byId.get(id) ?? []), i]));
  const pairs = [...byId.values()].map(([a, b]) => [a, b] as [number, number]);
  expect(pairs).toHaveLength(6);
  return { tiles, ids, pairs };
}

const faceUps = (tiles: Locator) => tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-face-up')));

async function expectNoWords(page: Page) {
  await expect(page.getByText(/word\d+/)).toHaveCount(0);
  const html = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => e.outerHTML).join(''));
  expect(html).not.toMatch(/word\d+/);
}

test('a matching pair stays face-up', async ({ page }) => {
  const { tiles, pairs } = await openBoard(page);
  const [a, b] = pairs[0];
  await tiles.nth(a).click();
  await tiles.nth(b).click();
  await expect(tiles.nth(a)).toHaveAttribute('data-matched', 'true');
  await expect(tiles.nth(b)).toHaveAttribute('data-matched', 'true');
  await expect(tiles.nth(a)).toHaveAttribute('data-face-up', 'true');
  await expect(tiles.nth(b)).toHaveAttribute('data-face-up', 'true');
  await expectNoWords(page);
});

test('a mismatching pair flips back after the pause', async ({ page }) => {
  const { tiles, ids } = await openBoard(page);
  const other = ids.findIndex((id) => id !== ids[0]);
  await tiles.nth(0).click();
  await tiles.nth(other).click();
  await expect(tiles.nth(0)).toHaveAttribute('data-face-up', 'true');
  await expect(tiles.nth(other)).toHaveAttribute('data-face-up', 'true');
  await expect(tiles.nth(0)).toHaveAttribute('data-face-up', 'false', { timeout: 3000 });
  await expect(tiles.nth(other)).toHaveAttribute('data-face-up', 'false');
});

test('clicking a matched tile again does not change the board', async ({ page }) => {
  const { tiles, pairs } = await openBoard(page);
  const [a, b] = pairs[0];
  await tiles.nth(a).click();
  await tiles.nth(b).click();
  await expect(tiles.nth(b)).toHaveAttribute('data-matched', 'true');
  const before = await faceUps(tiles);
  await tiles.nth(a).click();
  expect(await faceUps(tiles)).toEqual(before);
  await expect(page.locator('[data-memory-play]')).toHaveAttribute('data-won', 'false');
});

test('keyboard only: arrows + Space finish the whole game', async ({ page }) => {
  const { tiles, pairs } = await openBoard(page);
  let at = 0;
  const goTo = async (target: number) => {
    const dr = Math.floor(target / COLS) - Math.floor(at / COLS);
    const dc = (target % COLS) - (at % COLS);
    for (let i = 0; i < Math.abs(dr); i++) await page.keyboard.press(dr > 0 ? 'ArrowDown' : 'ArrowUp');
    for (let i = 0; i < Math.abs(dc); i++) await page.keyboard.press(dc > 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect(tiles.nth(target)).toBeFocused();
    at = target;
  };
  for (const [a, b] of pairs) {
    await goTo(a);
    await page.keyboard.press('Space');
    await expect(tiles.nth(a)).toHaveAttribute('data-face-up', 'true');
    await goTo(b);
    await page.keyboard.press('Space');
    await expect(tiles.nth(b)).toHaveAttribute('data-matched', 'true');
  }
  await expect(page.locator('[data-memory-play]')).toHaveAttribute('data-won', 'true');
  await expectNoWords(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the game still completes', async ({ page }) => {
    const { tiles, pairs } = await openBoard(page);
    await expect(page.locator('[data-memory-play]')).toHaveClass(/hm-reduced/);
    for (const [a, b] of pairs) {
      await tiles.nth(a).click();
      await tiles.nth(b).click();
      await expect(tiles.nth(b)).toHaveAttribute('data-matched', 'true');
    }
    await expect(page.locator('[data-memory-play]')).toHaveAttribute('data-won', 'true');
    await expectNoWords(page);
  });
});
