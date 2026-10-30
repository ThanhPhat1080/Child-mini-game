import type { Page } from '@playwright/test';

// playwright.config.ts sets STANDIN_PORT before the workers start.
export const STANDIN = `http://127.0.0.1:${process.env.STANDIN_PORT ?? 54391}`;

export type MemoryCardRow = {
  id: string;
  word: string;
  image_path: string;
  active: boolean;
  position: number;
  created_at: string;
};

export type SpotLevelRow = {
  id: string;
  image_a_path: string;
  image_b_path: string;
  differences: { x: number; y: number; r: number }[];
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Row = Record<string, unknown>;

export type StandinState = {
  memory_cards: Row[];
  spot_levels: Row[];
  settings: Row[];
  quiz_sets: Row[];
  questions: Row[];
  answers: Row[];
};

/** Replaces the whole stand-in state; with no argument it restores the default (18 cards, settings, no sets). */
export async function reset(state: Partial<StandinState> = {}): Promise<void> {
  const res = await fetch(`${STANDIN}/__reset`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`reset failed: ${res.status}`);
}

export async function getState(): Promise<StandinState> {
  const res = await fetch(`${STANDIN}/__state`);
  if (!res.ok) throw new Error(`getState failed: ${res.status}`);
  return (await res.json()) as StandinState;
}

/** n memory cards with words word1..wordN, all using the bundled apple art. */
export function makeCards(n: number, active = true): MemoryCardRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    word: `word${i + 1}`,
    image_path: 'seed/apple.svg',
    active,
    position: i + 1,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));
}

/** n spot levels (garden art, 3 valid differences each), ids ...a000-00000000000N. */
export function makeSpotLevels(n: number, active = true): SpotLevelRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, '0')}`,
    image_a_path: 'seed/spot/garden-a.svg',
    image_b_path: 'seed/spot/garden-b.svg',
    differences: [
      { x: 0.25, y: 0.3, r: 0.06 },
      { x: 0.5, y: 0.6, r: 0.06 },
      { x: 0.75, y: 0.4, r: 0.06 },
    ],
    active,
    sort_order: i + 1,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));
}

/** Signs in through the real login form (admin@test.local / secret). */
export async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/sign-in');
  await page.getByLabel('Email').fill('admin@test.local');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin/settings');
}
