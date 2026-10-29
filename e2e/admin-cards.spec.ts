import { expect, test, type Page } from '@playwright/test';
import { getState, makeCards, reset, signInAsAdmin, STANDIN } from './support/fixtures';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><circle cx="4" cy="4" r="3" fill="#E59AA1"/></svg>';
const svgFile = (name = 'x.svg') => ({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });

type CardRow = { id: string; word: string; image_path: string | null; active: boolean };
const cardsOf = async () => (await getState()).memory_cards as CardRow[];
const storage = async () => ((await getState()) as unknown as { storage: string[] }).storage;

/** Puts a file straight into the stand-in bucket (as if an earlier Save had uploaded it). */
async function putFile(path: string): Promise<void> {
  const fd = new FormData();
  fd.append('', new File([SVG], 'f.svg', { type: 'image/svg+xml' }));
  const res = await fetch(`${STANDIN}/storage/v1/object/media/${path}`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
}

/** Opens the Cards page and waits until the cards are loaded (the client fetch only runs after hydration). */
async function openCards(page: Page): Promise<void> {
  await page.goto('/admin/cards');
  await expect(page.getByRole('button', { name: 'Add card' })).toBeVisible();
}

const health = (page: Page) => page.getByTestId('pool-health');
const save = (page: Page) => page.getByRole('button', { name: 'Save' });

test.beforeEach(async ({ page }) => {
  await reset({ memory_cards: makeCards(12) });
  await signInAsAdmin(page);
});

test('the admin nav links to the Cards page', async ({ page }) => {
  await page.getByRole('link', { name: 'Cards' }).click();
  await expect(page).toHaveURL(/\/admin\/cards$/);
  await expect(page.getByRole('link', { name: 'Cards' })).toHaveAttribute('aria-current', 'page');
});

test('add a card with a picture and a word: nothing is uploaded until Save, then it persists', async ({ page }) => {
  await openCards(page);
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(save(page)).toBeDisabled(); // the new card has no picture or word yet
  await page.getByLabel('Picture file for card 13', { exact: true }).setInputFiles(svgFile());
  await page.getByLabel('Word for card 13', { exact: true }).fill('lion');
  await expect(page.getByRole('img', { name: 'Card 13 picture' })).toHaveAttribute('src', /^blob:/);
  await expect(save(page)).toBeEnabled();
  expect(await storage()).toEqual([]); // picking is only a local preview
  expect((await cardsOf()).some((c) => c.word === 'lion')).toBe(false);

  await save(page).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await expect(save(page)).toBeDisabled();

  const lion = (await cardsOf()).find((c) => c.word === 'lion');
  expect(lion?.image_path).toMatch(/^cards\/.+\.svg$/);
  expect(lion?.active).toBe(true);
  expect(await storage()).toEqual([lion!.image_path]);

  await page.reload();
  await expect(page.getByLabel('Word for card 13', { exact: true })).toHaveValue('lion');
  await expect(page.getByRole('img', { name: 'Card 13 picture' })).toHaveAttribute('src', new RegExp(`/storage/v1/object/public/media/${lion!.image_path}$`));
});

test('Revert discards unsaved edits', async ({ page }) => {
  await openCards(page);
  await page.getByLabel('Word for card 1', { exact: true }).fill('changed');
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.getByLabel('Word for card 13', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Revert' }).click();
  await expect(page.getByLabel('Word for card 1', { exact: true })).toHaveValue('word1');
  await expect(page.getByLabel('Word for card 13', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Revert' })).toBeDisabled();
  expect((await cardsOf()).map((c) => c.word)).toEqual(makeCards(12).map((c) => c.word));
});

test('turning a card off lowers the available levels, and Save stores it', async ({ page }) => {
  await openCards(page);
  await expect(health(page)).toHaveText('12 active cards: levels 12 and 24 are available; 30 needs 15.');
  await page.getByRole('switch', { name: 'Card 1 on' }).click();
  await expect(health(page)).toHaveText('11 active cards: level 12 is available; 24 needs 12, 30 needs 15.');
  await save(page).click();
  await expect(save(page)).toBeDisabled();
  await expect.poll(async () => (await cardsOf()).find((c) => c.word === 'word1')?.active).toBe(false);
});

test('Delete asks first and removes the row and its bucket file only after Save', async ({ page }) => {
  const rows = makeCards(3);
  rows[0] = { ...rows[0], image_path: 'cards/old.svg' };
  await reset({ memory_cards: rows });
  await putFile('cards/old.svg');
  await putFile('seed/apple.svg'); // bundled art is never ours to delete, even if a file had that name
  await openCards(page);

  await page.getByRole('button', { name: 'Delete card 1' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByLabel('Word for card 1', { exact: true })).toHaveValue('word1');

  await page.getByRole('button', { name: 'Delete card 1' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete card' }).click();
  await expect(page.getByLabel('Word for card 1', { exact: true })).toHaveValue('word2');
  // staged only: the database and the bucket are untouched until Save
  expect((await cardsOf()).map((c) => c.word)).toEqual(['word1', 'word2', 'word3']);
  expect((await storage()).sort()).toEqual(['cards/old.svg', 'seed/apple.svg']);

  // a card using bundled art goes too; its seed/ file must stay
  await page.getByRole('button', { name: 'Delete card 1' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete card' }).click();

  await save(page).click();
  await expect(save(page)).toBeDisabled();
  await expect.poll(async () => (await cardsOf()).map((c) => c.word)).toEqual(['word3']);
  await expect.poll(storage).toEqual(['seed/apple.svg']);
});
