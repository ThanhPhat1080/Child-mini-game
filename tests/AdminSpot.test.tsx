import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ELevel } from '@/lib/spot/adminLevels';

const h = vi.hoisted(() => ({
  loadLevels: vi.fn(),
  saveLevels: vi.fn(),
  addPending: vi.fn(),
  clearPending: vi.fn(),
  svgToPending: vi.fn(),
  naturalSize: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({ from: () => { throw new Error('the page must not touch the database directly'); } }),
}));
vi.mock('@/lib/spot/adminLevels', async (orig) => ({
  ...(await orig<typeof import('@/lib/spot/adminLevels')>()),
  loadLevels: h.loadLevels,
  saveLevels: h.saveLevels,
}));
vi.mock('@/lib/spot/imageSize', () => ({ naturalSize: h.naturalSize }));
vi.mock('@/lib/media', async (orig) => ({
  ...(await orig<typeof import('@/lib/media')>()),
  addPending: h.addPending,
  clearPending: h.clearPending,
  svgToPending: h.svgToPending,
  mediaUrl: (p: string | null) => (p ? (p.startsWith('pending:') ? `blob:${p}` : `/media/${p}`) : null),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => '/admin/spot' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import SpotPage from '@/app/admin/(panel)/spot/page';
import { AdminNav } from '@/components/AdminNav';

const three = [{ x: 0.2, y: 0.2, r: 0.06 }, { x: 0.5, y: 0.5, r: 0.06 }, { x: 0.8, y: 0.8, r: 0.06 }];
const level = (n: number, o: Partial<ELevel> = {}): ELevel => ({ id: `l${n}`, isNew: false, a: `spot/${n}a.png`, b: `spot/${n}b.png`, differences: three, active: true, ...o });

const saveBtn = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
const revertBtn = () => screen.getByRole('button', { name: 'Revert' }) as HTMLButtonElement;
const file = (name: string, type = 'image/png', size = 10) => new File([new Uint8Array(size)], name, { type });

async function renderWith(list: ELevel[]) {
  h.loadLevels.mockResolvedValue(list);
  render(<SpotPage />);
  await screen.findByRole('button', { name: 'Add level' });
}

/** Stubs the picture's rect so a click at fractions (fx, fy) maps back to them. */
function clickPictureA(n: number, fx: number, fy: number) {
  const art = within(screen.getByRole('article', { name: `Level ${n}` }));
  const img = art.getByRole('img', { name: 'Picture A' });
  img.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.click(img, { clientX: fx * 400, clientY: fy * 300 });
}

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.saveLevels.mockResolvedValue({ error: null, warning: null });
  h.naturalSize.mockResolvedValue({ w: 400, h: 300 });
  let n = 0;
  h.addPending.mockImplementation(() => `pending:${++n}`);
  h.svgToPending.mockImplementation(() => 'pending:svg');
});
afterEach(cleanup);

describe('Admin Spot page (A14-A16)', () => {
  it('lists each level with its pictures and on/off switch', async () => {
    await renderWith([level(1), level(2, { active: false })]);
    expect((screen.getByLabelText('Level 1 on') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Level 2 on') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('img', { name: 'Level 1 picture A thumbnail' }).getAttribute('src')).toBe('/media/spot/1a.png');
  });

  it('Save is disabled until both pictures and 3 differences exist', async () => {
    await renderWith([level(1)]);
    expect(saveBtn().disabled).toBe(true); // nothing changed
    fireEvent.click(screen.getByRole('button', { name: 'Add level' }));
    expect(saveBtn().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Picture A file for level 2'), { target: { files: [file('a.png')] } });
    fireEvent.change(screen.getByLabelText('Picture B file for level 2'), { target: { files: [file('b.png')] } });
    expect(saveBtn().disabled).toBe(true); // no spots yet
    clickPictureA(2, 0.2, 0.2);
    clickPictureA(2, 0.5, 0.5);
    expect(saveBtn().disabled).toBe(true); // 2 spots
    clickPictureA(2, 0.8, 0.8);
    expect(saveBtn().disabled).toBe(false);
  });

  it('removing a marker down to 2 disables Save again', async () => {
    await renderWith([level(1)]);
    fireEvent.click(screen.getByLabelText('Level 1 on')); // make it dirty
    expect(saveBtn().disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Spot 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete spot' }));
    expect(saveBtn().disabled).toBe(true);
  });

  it('an aspect mismatch above 2% warns but does not block Save', async () => {
    h.naturalSize.mockImplementation(async (url: string) => (url.endsWith('1b.png') ? { w: 400, h: 400 } : { w: 400, h: 300 }));
    await renderWith([level(1)]);
    await screen.findByText(/different shapes/i);
    fireEvent.click(screen.getByLabelText('Level 1 on'));
    expect(saveBtn().disabled).toBe(false);
  });

  it('no warning when the shapes are within 2%', async () => {
    h.naturalSize.mockImplementation(async (url: string) => (url.endsWith('1b.png') ? { w: 404, h: 300 } : { w: 400, h: 300 }));
    await renderWith([level(1)]);
    await waitFor(() => expect(h.naturalSize).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(screen.queryByText(/different shapes/i)).toBeNull();
  });

  it('rejects a wrong file type and an oversized picture', async () => {
    await renderWith([level(1)]);
    fireEvent.change(screen.getByLabelText('Picture A file for level 1'), { target: { files: [file('x.gif', 'image/gif')] } });
    expect(screen.getByRole('alert').textContent).toMatch(/PNG, JPG, WebP or SVG/);
    fireEvent.change(screen.getByLabelText('Picture A file for level 1'), { target: { files: [file('x.png', 'image/png', 3 * 1024 * 1024)] } });
    expect(screen.getByRole('alert').textContent).toMatch(/2 MB/);
    expect(h.addPending).not.toHaveBeenCalled();
  });

  it('Delete asks first: Cancel keeps the level, confirming removes it from the draft only', async () => {
    await renderWith([level(1), level(2)]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete level 1' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('article', { name: 'Level 2' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete level 1' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete level' }));
    expect(screen.queryByRole('article', { name: 'Level 2' })).toBeNull();
    expect(h.saveLevels).not.toHaveBeenCalled();
    expect(saveBtn().disabled).toBe(false);
  });

  it('Revert restores the loaded state and forgets picked files', async () => {
    await renderWith([level(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Add level' }));
    fireEvent.click(screen.getByLabelText('Level 1 on'));
    h.clearPending.mockClear();
    fireEvent.click(revertBtn());
    expect(screen.queryByRole('article', { name: 'Level 2' })).toBeNull();
    expect((screen.getByLabelText('Level 1 on') as HTMLInputElement).checked).toBe(true);
    expect(h.clearPending).toHaveBeenCalled();
    expect(revertBtn().disabled).toBe(true);
  });

  it('Save calls saveLevels(saved, draft), then reloads', async () => {
    const first = [level(1)];
    await renderWith(first);
    fireEvent.click(screen.getByLabelText('Level 1 on'));
    h.loadLevels.mockResolvedValue([level(1, { active: false })]);
    fireEvent.click(saveBtn());
    await waitFor(() => expect(h.loadLevels).toHaveBeenCalledTimes(2));
    expect(h.saveLevels).toHaveBeenCalledWith(first, [level(1, { active: false })]);
    await waitFor(() => expect(saveBtn().disabled).toBe(true));
  });

  it('shows the save error and keeps the draft', async () => {
    h.saveLevels.mockResolvedValue({ error: 'db down', warning: null });
    await renderWith([level(1)]);
    fireEvent.click(screen.getByLabelText('Level 1 on'));
    fireEvent.click(saveBtn());
    expect((await screen.findByRole('alert')).textContent).toBe('db down');
    expect(saveBtn().disabled).toBe(false);
  });

  it('up/down buttons reorder levels', async () => {
    await renderWith([level(1), level(2)]);
    expect((screen.getByRole('button', { name: 'Move level 1 up' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move level 2 down' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Move level 1 down' }));
    expect(within(screen.getByRole('article', { name: 'Level 1' })).getByRole('img', { name: 'Level 1 picture A thumbnail' }).getAttribute('src')).toBe('/media/spot/2a.png');
    expect(saveBtn().disabled).toBe(false);
  });

  it('"Preview as child" links to the level and is hidden for a new level', async () => {
    await renderWith([level(1)]);
    const link = screen.getByRole('link', { name: 'Preview as child' });
    expect(link.getAttribute('href')).toBe('/games/spot/l1');
    fireEvent.click(screen.getByRole('button', { name: 'Add level' }));
    expect(screen.getAllByRole('link', { name: 'Preview as child' })).toHaveLength(1);
  });

  it('the admin nav has a Spot link after Cards', () => {
    render(<AdminNav />);
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links.indexOf('Spot')).toBe(links.indexOf('Cards') + 1);
    expect(screen.getByRole('link', { name: 'Spot' }).getAttribute('href')).toBe('/admin/spot');
    expect(screen.getByRole('link', { name: 'Spot' }).getAttribute('aria-current')).toBe('page');
  });
});
