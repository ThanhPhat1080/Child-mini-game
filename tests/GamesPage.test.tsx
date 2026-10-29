import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { child_name: 'Ha My', avatar_path: null } }) }) }) }),
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }), usePathname: () => '/games' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/lib/media', () => ({ mediaUrl: (p: string | null) => (p ? `/media/${p}` : null) }));
vi.mock('@/components/MusicButton', () => ({ MusicButton: () => null }));

import Games from '@/app/games/page';

const quizHelp = () => screen.getByRole('button', { name: 'What is Quiz? Show how to play' });
const memHelp = () => screen.getByRole('button', { name: 'What is Memory Match? Show how to play' });

beforeEach(() => h.push.mockReset());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('games list help buttons', () => {
  it('Quiz and Memory Match each have a 130 px "?" button, Spot has none', () => {
    render(<Games />);
    expect(quizHelp().style.width).toBe('130px');
    expect(quizHelp().style.height).toBe('130px');
    expect(memHelp().style.width).toBe('130px');
    expect(memHelp().style.height).toBe('130px');
    expect(memHelp().style.left).toBe(quizHelp().style.left);
    expect(memHelp().style.top).toBe(quizHelp().style.top);
    expect(memHelp().className).toContain('hm-breathe');
    expect(screen.getAllByRole('button', { name: /What is/ })).toHaveLength(2);
  });

  it('the Memory "?" opens the Memory popup and does not start the game', () => {
    render(<Games />);
    fireEvent.click(memHelp());
    expect(screen.getByRole('dialog', { name: 'How to play Memory Match' })).toBeTruthy();
    expect(h.push).not.toHaveBeenCalled();
  });

  it('the Quiz "?" still opens the Quiz popup', () => {
    render(<Games />);
    fireEvent.click(quizHelp());
    expect(screen.getByRole('dialog', { name: 'How to play Quiz' })).toBeTruthy();
  });

  it('the Memory popup Play links to /games/memory', () => {
    render(<Games />);
    fireEvent.click(memHelp());
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Go to step 4' }));
    expect(within(dialog).getByRole('link', { name: 'Play Memory Match' }).getAttribute('href')).toBe('/games/memory');
  });

  it('Esc closes either popup without leaving; focus returns to the button that opened it', () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    render(<Games />);
    for (const btn of [memHelp(), quizHelp()]) {
      fireEvent.click(btn);
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      vi.runAllTimers();
      expect(document.activeElement).toBe(btn);
    }
    expect(h.push).not.toHaveBeenCalled();
  });

  it('arrows do not move the games carousel while a popup is open', () => {
    render(<Games />);
    const dot = (n: number) => screen.getByRole('button', { name: `Go to game ${n}` });
    expect(dot(1).getAttribute('aria-current')).toBe('true');
    fireEvent.click(memHelp());
    const view = document.querySelector('.hm-view') as HTMLElement;
    fireEvent.keyDown(view, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(dot(1).getAttribute('aria-current')).toBe('true');
  });
});
