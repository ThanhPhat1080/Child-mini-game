import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ fetchActiveCards: vi.fn(), push: vi.fn() }));

vi.mock('@/lib/memory/cards', () => ({ fetchActiveCards: h.fetchActiveCards }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }), usePathname: () => '/games/memory' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/components/MusicButton', () => ({ MusicButton: () => null }));

import MemoryLevels from '@/app/games/memory/page';

const cards = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, word: `w${i}`, image_path: 'a.svg', audio_path: null, active: true }));
const link = (n: number) => screen.getByRole('link', { name: `${n} cards` });

beforeEach(() => {
  h.fetchActiveCards.mockReset();
  h.push.mockReset();
});
afterEach(cleanup);

describe('Memory level select (M1)', () => {
  it('4 cards: all three levels are disabled buttons', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(4));
    render(<MemoryLevels />);
    for (const n of [12, 24, 30]) {
      const b = (await screen.findByRole('button', { name: `${n} cards` })) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      expect(b.getAttribute('aria-disabled')).toBe('true');
    }
    expect(screen.queryByRole('link', { name: /cards/ })).toBeNull();
  });

  it('6 cards: only the 12-card level is enabled', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(6));
    render(<MemoryLevels />);
    expect((await screen.findByRole('link', { name: '12 cards' })).getAttribute('href')).toBe('/games/memory/12');
    expect((screen.getByRole('button', { name: '24 cards' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '30 cards' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('15 cards: all three are links to their level', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(15));
    render(<MemoryLevels />);
    await screen.findByRole('link', { name: '12 cards' });
    expect(link(12).getAttribute('href')).toBe('/games/memory/12');
    expect(link(24).getAttribute('href')).toBe('/games/memory/24');
    expect(link(30).getAttribute('href')).toBe('/games/memory/30');
  });

  it('0 cards shows a friendly picture screen, no alert, no level buttons', async () => {
    h.fetchActiveCards.mockResolvedValue([]);
    render(<MemoryLevels />);
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('link', { name: /cards/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /cards/ })).toBeNull();
  });

  it('a fetch error shows the same friendly screen, not an alert', async () => {
    h.fetchActiveCards.mockRejectedValue(new Error('boom'));
    render(<MemoryLevels />);
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /cards/ })).toBeNull();
  });

  it('the first enabled level is focused on arrival', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(15));
    render(<MemoryLevels />);
    const first = await screen.findByRole('link', { name: '12 cards' });
    await waitFor(() => expect(document.activeElement).toBe(first));
  });

  it('Right and Left move among enabled levels only', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(15));
    render(<MemoryLevels />);
    await waitFor(() => expect(document.activeElement).toBe(link(12)));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(link(24));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(link(30));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(link(24));
  });

  it('Right skips disabled levels (stays on the only enabled one)', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(6));
    render(<MemoryLevels />);
    await waitFor(() => expect(document.activeElement).toBe(link(12)));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(link(12));
  });

  it('Space clicks the focused link', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(15));
    render(<MemoryLevels />);
    await waitFor(() => expect(document.activeElement).toBe(link(12)));
    const click = vi.fn((e: Event) => e.preventDefault());
    link(12).addEventListener('click', click);
    fireEvent.keyDown(link(12), { key: ' ' });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('Esc goes to the game list; the back button links there', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(15));
    render(<MemoryLevels />);
    await screen.findByRole('link', { name: '12 cards' });
    expect(screen.getByRole('link', { name: 'Back to games' }).getAttribute('href')).toBe('/games');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(h.push).toHaveBeenCalledWith('/games');
  });
});
