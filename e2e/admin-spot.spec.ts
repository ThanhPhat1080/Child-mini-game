import { expect, test, type Page } from '@playwright/test';
import { getState, makeSpotLevels, reset, signInAsAdmin } from './support/fixtures';

const A = 'public/seed/spot/garden-a.svg';
const B = 'public/seed/spot/garden-b.svg';

type LevelRow = { id: string; image_a_path: string; image_b_path: string; differences: { x: number; y: number; r: number }[]; active: boolean; sort_order: number };
const levelsOf = async () => (await getState()).spot_levels as LevelRow[];
const storage = async () => ((await getState()) as unknown as { storage: string[] }).storage;
const save = (page: Page) => page.getByRole('button', { name: 'Save' });

async function openSpot(page: Page): Promise<void> {
  await page.goto('/admin/spot');
  await expect(page.getByRole('button', { name: 'Add level' })).toBeVisible();
}

/** Clicks picture A of the first level at fractions of its box. */
async function clickA(page: Page, fx: number, fy: number): Promise<void> {
  const img = page.getByRole('article', { name: 'Level 1' }).getByRole('img', { name: 'Picture A', exact: true });
  await img.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await img.boundingBox())?.width ?? 0).toBeGreaterThan(200); // wait for the picture to load
  const box = (await img.boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

test.beforeEach(async ({ page }) => {
  await reset({ spot_levels: [] });
  await signInAsAdmin(page);
});

test('the admin nav links to the Spot page', async ({ page }) => {
  await page.getByRole('link', { name: 'Spot', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/spot$/);
  await expect(page.getByRole('link', { name: 'Spot', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('build a level, save it, play it, delete it', async ({ page }) => {
  await openSpot(page);
  await page.getByRole('button', { name: 'Add level' }).click();
  await expect(save(page)).toBeDisabled();
  await page.getByLabel('Picture A file for level 1', { exact: true }).setInputFiles(A);
  await page.getByLabel('Picture B file for level 1', { exact: true }).setInputFiles(B);
  await expect(page.getByText(/different shapes/i)).toHaveCount(0);

  await clickA(page, 0.25, 0.3);
  await clickA(page, 0.5, 0.6);
  await expect(save(page)).toBeDisabled(); // 2 spots
  await clickA(page, 0.75, 0.4);
  await expect(save(page)).toBeEnabled();
  expect(await storage()).toEqual([]); // nothing is uploaded before Save
  expect(await levelsOf()).toHaveLength(0);

  await save(page).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  const rows = await levelsOf();
  expect(rows).toHaveLength(1);
  expect(rows[0].differences).toHaveLength(3);
  for (const d of rows[0].differences) {
    expect(d.x).toBeGreaterThan(0); expect(d.x).toBeLessThan(1);
    expect(d.r).toBe(0.06);
  }
  expect(rows[0].image_a_path).toMatch(/^spot\/.+\.svg$/);
  expect(rows[0].image_b_path).toMatch(/^spot\/.+\.svg$/);
  expect([...(await storage())].sort()).toEqual([rows[0].image_a_path, rows[0].image_b_path].sort());

  await page.goto('/games/spot');
  await expect(page.getByRole('link', { name: /^Play level/ })).toHaveCount(1);

  await openSpot(page);
  await page.getByRole('button', { name: 'Delete level 1' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete level' }).click();
  await save(page).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(await levelsOf()).toHaveLength(0);
  await page.goto('/games/spot');
  await expect(page.getByRole('link', { name: /^Play level/ })).toHaveCount(0);
});

test('a draft (inactive) level can be previewed as the child while signed in', async ({ page, context }) => {
  const [draft] = makeSpotLevels(1, false);
  await reset({ spot_levels: [draft] });
  await openSpot(page);
  await expect(page.getByLabel('Level 1 on')).not.toBeChecked();
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Preview as child' }).click()]);
  await expect(popup).toHaveURL(new RegExp(`/games/spot/${draft.id}$`));
  await expect(popup.getByRole('img').first()).toBeVisible();
});

test('Revert discards unsaved spots', async ({ page }) => {
  await reset({ spot_levels: makeSpotLevels(1) });
  await openSpot(page);
  await clickA(page, 0.9, 0.9);
  await expect(page.getByRole('button', { name: 'Spot 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Revert' }).click();
  await expect(page.getByRole('button', { name: 'Spot 4' })).toHaveCount(0);
  await expect(save(page)).toBeDisabled();
});
