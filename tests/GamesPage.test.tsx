import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
import { MEMORY_ICON } from '@/components/games/GameArt';

const icon = (id: string) => document.querySelector(`[data-game-icon="${id}"]`) as HTMLElement;
const frame = (name: string) => screen.getByRole('link', { name }) as HTMLElement;

beforeEach(() => h.push.mockReset());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('games list decorative icons', () => {
  it('has no help buttons and no dialog; clicking an icon never opens a popup', () => {
    render(<Games />);
    expect(screen.queryAllByRole('button', { name: /What is/ })).toHaveLength(0);
    fireEvent.click(icon('quiz'));
    fireEvent.click(icon('memory'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Quiz and Memory cards each have a decorative 130 px icon at the same spot; only those two have one', () => {
    render(<Games />);
    for (const id of ['quiz', 'memory']) {
      const el = icon(id);
      expect(el).toBeTruthy();
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.style.pointerEvents).toBe('none');
      expect(el.tagName).not.toBe('BUTTON');
      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.style.width).toBe('130px');
      expect(el.style.height).toBe('130px');
      expect(el.querySelector('svg')).toBeTruthy();
    }
    expect(icon('memory').style.left).toBe(icon('quiz').style.left);
    expect(icon('memory').style.top).toBe(icon('quiz').style.top);
    expect(document.querySelectorAll('[data-game-icon]')).toHaveLength(2);
  });

  it('the Memory icon is two flower cards, different from the Quiz question mark', () => {
    render(<Games />);
    expect(icon('memory').querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(10);
    expect(icon('quiz').querySelectorAll('ellipse')).toHaveLength(0);
  });

  it('the Memory icon cards (rotated corners) fit inside the circle, and the circle is drawn', () => {
    render(<Games />);
    const circle = icon('memory').querySelector('circle') as SVGCircleElement;
    expect(circle.getAttribute('fill')).toBe('#F8DCDF');
    expect(Number(circle.getAttribute('r'))).toBe(10);
    for (const { dx, dy, rot } of MEMORY_ICON.cards) {
      const t = (rot * Math.PI) / 180;
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const px = (x * MEMORY_ICON.w) / 2, py = (y * MEMORY_ICON.h) / 2;
        const cx = dx + px * Math.cos(t) - py * Math.sin(t), cy = dy + px * Math.sin(t) + py * Math.cos(t);
        expect(Math.hypot(cx, cy)).toBeLessThanOrEqual(MEMORY_ICON.maxR);
      }
    }
  });

  it('the icons are not in the Tab order (only card links, arrows, dots)', () => {
    render(<Games />);
    expect(document.querySelectorAll('[data-game-icon] a, [data-game-icon] button, [data-game-icon] [tabindex]')).toHaveLength(0);
  });

  it('Memory Match has sage border and title; Quiz stays rose; Spot stays sky', () => {
    render(<Games />);
    expect(frame('Play Memory Match').style.border).toContain('rgb(169, 205, 177)');
    expect(frame('Play Quiz').style.border).toContain('rgb(235, 183, 188)');
    expect(frame('Play Memory Match').style.borderColor).not.toBe(frame('Play Quiz').style.borderColor);
    const title = (name: string) => frame(name).lastElementChild as HTMLElement;
    expect(title('Play Memory Match').textContent).toBe('Memory Match');
    expect(title('Play Memory Match').style.color).toBe('rgb(94, 143, 105)');
    expect(title('Play Quiz').style.color).toBe('rgb(184, 115, 123)');
  });

  it('Enter on the focused carousel opens a ready game', () => {
    render(<Games />);
    const view = document.querySelector('.hm-view') as HTMLElement;
    fireEvent.keyDown(view, { key: 'Enter' });
    expect(h.push).toHaveBeenCalledWith('/games/quiz');
  });
});
