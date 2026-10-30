import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ECard, EGroup } from '@/lib/memory/adminCards';

const h = vi.hoisted(() => ({
  loadCards: vi.fn(),
  saveCards: vi.fn(),
  sayWord: vi.fn(),
  addPending: vi.fn(),
  clearPending: vi.fn(),
  svgToPending: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => { throw new Error('the page must not touch the database directly'); },
    storage: { from: () => ({ upload: h.upload, remove: h.upload }) },
  }),
}));
vi.mock('@/lib/memory/adminCards', async (orig) => ({
  ...(await orig<typeof import('@/lib/memory/adminCards')>()),
  loadCards: h.loadCards,
  saveCards: h.saveCards,
}));
vi.mock('@/lib/memory/cards', () => ({ sayWord: h.sayWord }));
vi.mock('@/lib/media', async (orig) => ({
  ...(await orig<typeof import('@/lib/media')>()),
  addPending: h.addPending,
  clearPending: h.clearPending,
  svgToPending: h.svgToPending,
  mediaUrl: (p: string | null) => (p ? (p.startsWith('pending:') ? `blob:${p}` : `/media/${p}`) : null),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }), usePathname: () => '/admin/cards' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import CardsPage from '@/app/admin/(panel)/cards/page';
import { AdminNav } from '@/components/AdminNav';
import { CardPanel } from '@/components/admin/CardPanel';

const card = (n: number, o: Partial<ECard> = {}): ECard => ({ id: `c${n}`, isNew: false, word: `word${n}`, image: `cards/${n}.png`, audio: null, active: true, groupId: null, ...o });
const cards = (n: number, active = true) => Array.from({ length: n }, (_, i) => card(i + 1, { active }));

const saveBtn = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
const revertBtn = () => screen.getByRole('button', { name: 'Revert' }) as HTMLButtonElement;
const word = (n: number) => screen.getByLabelText(`Word for card ${n}`) as HTMLInputElement;
const toggle = (n: number) => screen.getByRole('switch', { name: `Card ${n} on` }) as HTMLInputElement;
const health = () => screen.getByTestId('pool-health').textContent ?? '';
const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

async function renderWith(list: ECard[]) {
  h.loadCards.mockResolvedValue(list);
  render(<CardsPage />);
  await screen.findByRole('button', { name: 'Add card' });
  await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
}

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.saveCards.mockResolvedValue({ error: null, warning: null });
  let n = 0;
  h.addPending.mockImplementation(() => `pending:${++n}`);
  h.svgToPending.mockImplementation(() => 'pending:svg');
});
afterEach(cleanup);

describe('Admin cards page (A11, A13)', () => {
  it('lists every card with its picture, word and on/off toggle', async () => {
    await renderWith([card(1), card(2, { active: false })]);
    expect(word(1).value).toBe('word1');
    expect(word(2).value).toBe('word2');
    expect((screen.getByRole('img', { name: 'Card 1 picture' }) as HTMLImageElement).getAttribute('src')).toBe('/media/cards/1.png');
    expect(toggle(1).checked).toBe(true);
    expect(toggle(2).checked).toBe(false);
  });

  it('"Add card" appends an empty card', async () => {
    await renderWith([card(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    expect(word(2).value).toBe('');
    expect(toggle(2).checked).toBe(true);
    expect(screen.queryByRole('img', { name: 'Card 2 picture' })).toBeNull();
  });

  it('Save stays disabled until every card is complete and something changed', async () => {
    await renderWith([card(1)]);
    expect(saveBtn().disabled).toBe(true); // nothing changed yet
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    expect(saveBtn().disabled).toBe(true); // new card has no word and no picture
    fireEvent.change(word(2), { target: { value: 'lion' } });
    expect(saveBtn().disabled).toBe(true); // still no picture
    fireEvent.change(screen.getByLabelText('Picture file for card 2'), { target: { files: [file('lion.png', 'image/png')] } });
    expect(saveBtn().disabled).toBe(false);
  });

  it('the word input stops at 40 characters and shows a counter', async () => {
    await renderWith([card(1)]);
    expect(word(1).maxLength).toBe(40);
    expect(screen.getByText('5/40')).toBeTruthy();
  });

  it('Save calls saveCards(saved, draft), then reloads and clears picked files', async () => {
    const first = [card(1)];
    await renderWith(first);
    fireEvent.change(word(1), { target: { value: 'kitten' } });
    const after = [card(1, { word: 'kitten' })];
    h.loadCards.mockResolvedValue(after);
    h.clearPending.mockClear();
    fireEvent.click(saveBtn());
    await waitFor(() => expect(h.loadCards).toHaveBeenCalledTimes(2));
    expect(h.saveCards).toHaveBeenCalledWith(first, [card(1, { word: 'kitten' })]);
    await waitFor(() => expect(saveBtn().disabled).toBe(true));
    expect(h.clearPending).toHaveBeenCalled();
    expect(word(1).value).toBe('kitten');
  });

  it('Revert restores the loaded cards and forgets picked files', async () => {
    await renderWith([card(1)]);
    fireEvent.change(word(1), { target: { value: 'changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    h.clearPending.mockClear();
    fireEvent.click(revertBtn());
    expect(word(1).value).toBe('word1');
    expect(screen.queryByLabelText('Word for card 2')).toBeNull();
    expect(h.clearPending).toHaveBeenCalled();
    expect(revertBtn().disabled).toBe(true);
  });

  it('Delete asks first: Cancel keeps the card, confirming removes it from the draft only', async () => {
    await renderWith([card(1), card(2)]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete card 1' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(word(1).value).toBe('word1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete card 1' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete card' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(word(1).value).toBe('word2');
    expect(screen.queryByLabelText('Word for card 2')).toBeNull();
    expect(h.saveCards).not.toHaveBeenCalled();
    expect(saveBtn().disabled).toBe(false);
  });

  it('picking a picture only keeps it in memory (addPending) and previews it; nothing is uploaded', async () => {
    await renderWith([card(1)]);
    const f = file('lion.png', 'image/png');
    fireEvent.change(screen.getByLabelText('Picture file for card 1'), { target: { files: [f] } });
    expect(h.addPending).toHaveBeenCalledWith(f);
    expect(screen.getByRole('img', { name: 'Card 1 picture' }).getAttribute('src')).toBe('blob:pending:1');
    expect(h.upload).not.toHaveBeenCalled();
  });

  it('a picture over 2 MB or of the wrong type shows a message at once and is not added', async () => {
    await renderWith([card(1)]);
    const input = screen.getByLabelText('Picture file for card 1');
    fireEvent.change(input, { target: { files: [file('big.png', 'image/png', 2 * 1024 * 1024 + 1)] } });
    expect(screen.getByText('Image must be 2 MB or smaller.')).toBeTruthy();
    fireEvent.change(input, { target: { files: [file('a.gif', 'image/gif')] } });
    expect(screen.getByText('Use a PNG, JPG, WebP or SVG picture.')).toBeTruthy();
    expect(h.addPending).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Card 1 picture' }).getAttribute('src')).toBe('/media/cards/1.png');
  });

  it('a sound file is kept in memory; a wrong sound type shows a message', async () => {
    await renderWith([card(1)]);
    const input = screen.getByLabelText('Sound file for card 1');
    fireEvent.change(input, { target: { files: [file('a.txt', 'text/plain')] } });
    expect(screen.getByText('Use an MP3, M4A or WAV sound.')).toBeTruthy();
    expect(h.addPending).not.toHaveBeenCalled();
    const f = file('cat.mp3', 'audio/mpeg');
    fireEvent.change(input, { target: { files: [f] } });
    expect(h.addPending).toHaveBeenCalledWith(f);
    fireEvent.click(screen.getByRole('button', { name: 'Play card 1' }));
    expect(h.sayWord).toHaveBeenCalledWith({ word: 'word1', audio_path: 'pending:1' });
  });

  it('SVG code becomes a picture through svgToPending', async () => {
    await renderWith([card(1)]);
    fireEvent.change(screen.getByLabelText('SVG code for card 1'), { target: { value: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use SVG for card 1' }));
    expect(h.svgToPending).toHaveBeenCalledWith('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(screen.getByRole('img', { name: 'Card 1 picture' }).getAttribute('src')).toBe('blob:pending:svg');
  });

  it('pasted SVG with a script or an event handler is refused inline and never stored', async () => {
    await renderWith([card(1)]);
    const paste = (code: string) => {
      fireEvent.change(screen.getByLabelText('SVG code for card 1'), { target: { value: code } });
      fireEvent.click(screen.getByRole('button', { name: 'Use SVG for card 1' }));
    };
    paste('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(screen.getByText('SVG code may not contain scripts, foreignObject or embedded content.')).toBeTruthy();
    paste('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="4" height="4"/></svg>');
    expect(screen.getByText('SVG code may not contain event handlers such as onclick.')).toBeTruthy();
    expect(h.svgToPending).not.toHaveBeenCalled();
    expect(h.addPending).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Card 1 picture' }).getAttribute('src')).toBe('/media/cards/1.png');
  });

  it('valid pasted SVG is accepted, and drawings that differ only in whitespace share one pending file', async () => {
    const tokens = new Map<string, string>();
    h.svgToPending.mockImplementation((svg: string) => {
      if (!tokens.has(svg)) tokens.set(svg, `pending:svg${tokens.size + 1}`);
      return tokens.get(svg)!;
    });
    await renderWith([card(1), card(2)]);
    const paste = (n: number, code: string) => {
      fireEvent.change(screen.getByLabelText(`SVG code for card ${n}`), { target: { value: code } });
      fireEvent.click(screen.getByRole('button', { name: `Use SVG for card ${n}` }));
    };
    paste(1, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>');
    paste(2, '  <svg xmlns="http://www.w3.org/2000/svg">\n   <rect  width="4"\n height="4"/>\n</svg>\n');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(tokens.size).toBe(1);
    expect(screen.getByRole('img', { name: 'Card 1 picture' }).getAttribute('src')).toBe('blob:pending:svg1');
    expect(screen.getByRole('img', { name: 'Card 2 picture' }).getAttribute('src')).toBe('blob:pending:svg1');
  });

  it('sound types are stored under the names the bucket allows (x-m4a -> mp4, x-wav -> wav)', async () => {
    await renderWith([card(1), card(2)]);
    fireEvent.change(screen.getByLabelText('Sound file for card 1'), { target: { files: [file('cat.m4a', 'audio/x-m4a')] } });
    fireEvent.change(screen.getByLabelText('Sound file for card 2'), { target: { files: [file('dog.wav', 'audio/x-wav')] } });
    const [m4a, wav] = h.addPending.mock.calls.map((c) => c[0] as File);
    expect([m4a.name, m4a.type]).toEqual(['cat.m4a', 'audio/mp4']);
    expect([wav.name, wav.type]).toEqual(['dog.wav', 'audio/wav']);
  });

  it('a sound over 10 MB shows a message at once and is not added', async () => {
    await renderWith([card(1)]);
    fireEvent.change(screen.getByLabelText('Sound file for card 1'), { target: { files: [file('long.mp3', 'audio/mpeg', 10 * 1024 * 1024 + 1)] } });
    expect(screen.getByText('Sound must be 10 MB or smaller.')).toBeTruthy();
    expect(h.addPending).not.toHaveBeenCalled();
  });

  it('two cards with the same word show a warning that does not block Save', async () => {
    await renderWith([card(1), card(2)]);
    fireEvent.change(word(2), { target: { value: ' WORD1 ' } });
    expect(screen.getAllByText('Another card has the same word.')).toHaveLength(2);
    expect(saveBtn().disabled).toBe(false);
  });

  it('"play" says the card through sayWord', async () => {
    await renderWith([card(1), card(2, { audio: 'card-voices/2.mp3' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Play card 2' }));
    expect(h.sayWord).toHaveBeenCalledWith({ word: 'word2', audio_path: 'card-voices/2.mp3' });
  });

  it('the pool health line reflects active cards', async () => {
    await renderWith(cards(12));
    expect(health()).toBe('12 active cards: levels 12, 16, 20 and 24 are available; 30 needs 15.');
    fireEvent.click(toggle(1));
    expect(health()).toBe('11 active cards: levels 12, 16 and 20 are available; 24 needs 12, 30 needs 15.');
  });

  it('pool health with 5 and 6 active cards', async () => {
    await renderWith(cards(6));
    expect(health()).toBe('6 active cards: level 12 is available; 16 needs 8, 20 needs 10, 24 needs 12, 30 needs 15.');
  });

  it('pool health with 0 and with 15 active cards', async () => {
    await renderWith(cards(3, false));
    expect(health()).toBe('0 active cards: no level is available yet; 12 needs 6, 16 needs 8, 20 needs 10, 24 needs 12, 30 needs 15.');
    cleanup();
    await renderWith(cards(15));
    expect(health()).toBe('15 active cards: levels 12, 16, 20, 24 and 30 are available.');
  });

  it('a failing save shows the error and keeps the draft', async () => {
    await renderWith([card(1)]);
    fireEvent.change(word(1), { target: { value: 'kitten' } });
    h.saveCards.mockResolvedValue({ error: 'network down', warning: null });
    fireEvent.click(saveBtn());
    expect(await screen.findByText('network down')).toBeTruthy();
    expect(word(1).value).toBe('kitten');
    expect(h.loadCards).toHaveBeenCalledTimes(1);
    expect(saveBtn().disabled).toBe(false);
  });

  it('a save warning is shown but the save still goes through', async () => {
    await renderWith([card(1)]);
    fireEvent.change(word(1), { target: { value: 'kitten' } });
    h.loadCards.mockResolvedValue([card(1, { word: 'kitten' })]);
    h.saveCards.mockResolvedValue({ error: null, warning: 'Some old files could not be removed.' });
    await act(async () => { fireEvent.click(saveBtn()); });
    expect(await screen.findByText('Some old files could not be removed.')).toBeTruthy();
    await waitFor(() => expect(h.loadCards).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(saveBtn().disabled).toBe(true));
  });

  it('Quick import cards appends them as unsaved changes; identical SVG shares one pending token', async () => {
    const tokens = new Map<string, string>();
    h.svgToPending.mockImplementation((svg: string) => {
      if (!tokens.has(svg)) tokens.set(svg, `pending:svg${tokens.size + 1}`);
      return tokens.get(svg)!;
    });
    await renderWith([card(1)]);
    expect(saveBtn().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Quick import cards' }));
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8'/></svg>";
    const json = JSON.stringify({ cards: [
      { word: 'lion', image: svg }, { word: 'tiger', image: svg }, { word: 'bear', image: 'https://example.com/b.png' }, { word: 'fox', image: '', active: false },
    ] });
    const input = document.querySelector('input[type="file"][accept=".json,application/json"]') as HTMLInputElement;
    const f = new File([json], 'c.json', { type: 'application/json' });
    Object.defineProperty(f, 'text', { value: () => Promise.resolve(json) });
    fireEvent.change(input, { target: { files: [f] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import 4 cards' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect([2, 3, 4, 5].map((n) => word(n).value)).toEqual(['lion', 'tiger', 'bear', 'fox']);
    expect(tokens.size).toBe(1);
    expect(screen.getByRole('img', { name: 'Card 2 picture' }).getAttribute('src')).toBe('blob:pending:svg1');
    expect(screen.getByRole('img', { name: 'Card 3 picture' }).getAttribute('src')).toBe('blob:pending:svg1');
    expect(toggle(5).checked).toBe(false);
    expect(screen.queryByRole('img', { name: 'Card 5 picture' })).toBeNull();
    expect(saveBtn().disabled).toBe(true); // fox has no picture yet
    expect(screen.getByText(/1 card needs a picture/)).toBeTruthy();
    expect(h.saveCards).not.toHaveBeenCalled();
    fireEvent.click(revertBtn());
    expect(screen.queryByLabelText('Word for card 2')).toBeNull();
  });

  describe('Quick import cards header button', () => {
    const importBtn = () => screen.getByRole('button', { name: 'Quick import cards' }) as HTMLButtonElement;

    it('sits in the sticky header before Revert and Save, as a blue text button', async () => {
      await renderWith([card(1)]);
      expect(screen.getAllByRole('button', { name: 'Quick import cards' })).toHaveLength(1);
      const header = revertBtn().closest('div[style*="sticky"]') as HTMLElement;
      expect(header).toBeTruthy();
      expect(header.contains(importBtn())).toBe(true);
      expect(header.contains(saveBtn())).toBe(true);
      const order = Array.from(header.querySelectorAll('button')).map((b) => b.textContent);
      expect(order).toEqual(['Quick import cards', 'Revert', 'Save']);
      const css = getComputedStyle(importBtn());
      expect(css.color).toBe('rgb(63, 115, 181)'); // the blue of the set editor's import button
      expect(css.backgroundColor === 'transparent' || css.backgroundColor === 'rgba(0, 0, 0, 0)' || css.backgroundColor === '').toBe(true);
      expect(css.height).toBe('44px');
    });

    it('opens the dialog with no unsaved changes (Save and Revert disabled)', async () => {
      await renderWith([card(1)]);
      expect(saveBtn().disabled).toBe(true);
      expect(revertBtn().disabled).toBe(true);
      expect(importBtn().disabled).toBe(false);
      fireEvent.click(importBtn());
      expect(await screen.findByRole('dialog', { name: 'Quick import cards' })).toBeTruthy();
    });

    it('is disabled while a save is running', async () => {
      await renderWith([card(1)]);
      fireEvent.change(word(1), { target: { value: 'kitten' } });
      let done: (v: { error: null }) => void = () => {};
      h.saveCards.mockReturnValue(new Promise((r) => { done = r; }));
      h.loadCards.mockResolvedValue([card(1, { word: 'kitten' })]);
      await act(async () => { fireEvent.click(saveBtn()); });
      expect(importBtn().disabled).toBe(true);
      await act(async () => { done({ error: null }); });
      await waitFor(() => expect(importBtn().disabled).toBe(false));
    });
  });

  it('the admin nav has a "Cards" link, marked current on /admin/cards', () => {
    render(<AdminNav />);
    const link = screen.getByRole('link', { name: 'Cards' });
    expect(link.getAttribute('href')).toBe('/admin/cards');
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});

describe('CardPanel group picker (A15)', () => {
  const GROUPS: EGroup[] = [{ id: 'g1', isNew: false, name: 'Animals' }, { id: 'g2', isNew: true, name: 'Fruit' }];
  const WEAK = 'Sort It needs at least 4 cards with different words in a group.';
  function renderPanel(c: ECard, weakGroup = false) {
    const onEdit = vi.fn();
    const noop = () => {};
    render(
      <CardPanel c={c} n={3} duplicate={false} message={null} autoFocus={false} groups={GROUPS} weakGroup={weakGroup}
        onEdit={onEdit} onPickImage={noop} onPickAudio={noop} onSvg={noop} onPlay={noop} onAskDelete={noop} />,
    );
    return { onEdit, select: screen.getByRole('combobox', { name: 'Group for card 3' }) as HTMLSelectElement };
  }

  it('lists "No group" first, then the groups in order', () => {
    const { select } = renderPanel(card(3));
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['No group', 'Animals', 'Fruit']);
    expect(select.options[select.selectedIndex].textContent).toBe('No group');
  });

  it('shows the card\'s group and choosing another calls onEdit({ groupId })', () => {
    const { select, onEdit } = renderPanel(card(3, { groupId: 'g1' }));
    expect(select.options[select.selectedIndex].textContent).toBe('Animals');
    fireEvent.change(select, { target: { value: 'g2' } });
    expect(onEdit).toHaveBeenCalledWith({ groupId: 'g2' });
    fireEvent.change(select, { target: { value: '' } });
    expect(onEdit).toHaveBeenLastCalledWith({ groupId: null });
  });

  it('a card whose group is missing shows "No group"', () => {
    const { select } = renderPanel(card(3, { groupId: 'gone' }));
    expect(select.value).toBe('');
    expect(select.options[select.selectedIndex].textContent).toBe('No group');
  });

  it('the weak group warning shows only when weakGroup', () => {
    renderPanel(card(3, { groupId: 'g1' }));
    expect(screen.queryByText(WEAK)).toBeNull();
    cleanup();
    renderPanel(card(3, { groupId: 'g1' }), true);
    expect(screen.getByText(WEAK).getAttribute('role')).toBe('status');
  });
});
