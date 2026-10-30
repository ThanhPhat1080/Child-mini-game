import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoryCard } from '@/lib/memory/types';

const h = vi.hoisted(() => ({
  fetchActiveCards: vi.fn(),
  sayWord: vi.fn(),
  stopWord: vi.fn(),
  yay: vi.fn(),
  ohOh: vi.fn(),
  recordWrong: vi.fn(),
  clearWrong: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  settings: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/lib/memory/cards', () => ({ fetchActiveCards: h.fetchActiveCards, sayWord: h.sayWord, stopWord: h.stopWord }));
vi.mock('@/lib/sfx', () => ({ yay: h.yay, ohOh: h.ohOh, applause: vi.fn(), speakKid: vi.fn(), playFile: vi.fn(), chime: vi.fn(), flipTick: vi.fn() }));
vi.mock('@/lib/listen/wrongLog', () => ({ recordWrong: h.recordWrong, clearWrong: h.clearWrong, readWrong: () => [], totalWrong: () => 0, WRONG_KEY: 'hamy.listen.wrong' }));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    from: () => ({ select: (cols: string) => { h.select(cols); return { eq: () => ({ single: () => h.settings() }) }; } }),
  }),
}));
vi.mock('@/lib/media', () => ({ mediaUrl: (p: string | null | undefined) => (p ? `/media/${p}` : null) }));
vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: h.push, replace: h.replace }),
  usePathname: () => '/games/listen',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('@/components/MusicButton', () => ({ MusicButton: () => null }));

import ListenPlay, {
  FINISH_DELAY_MS,
  HOORAY_CAP_MS,
  NEXT_PAUSE_MS,
  SAY_AFTER_SHOW_MS,
  SAY_AFTER_WRONG_MS,
  STEP_CAP_MS,
} from '@/app/games/listen/page';
import { PRELOAD_MS } from '@/lib/memory/preload';

const cards = (n: number): MemoryCard[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, word: `word${i}`, image_path: `c${i}.svg`, audio_path: null, active: true }));

const root = () => document.querySelector<HTMLElement>('[data-listen-play]')!;
const question = () => document.querySelector<HTMLElement>('[data-question-index]');
const qIndex = () => question()?.getAttribute('data-question-index') ?? null;
const answers = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-answer]'));
const rightIdx = () => answers().findIndex((b) => b.getAttribute('data-card-id') === question()!.getAttribute('data-answer-id'));
const wrongIdxs = () => [0, 1, 2].filter((i) => i !== rightIdx());
const answerId = () => question()!.getAttribute('data-answer-id');
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const badge = () => screen.getByRole('button', { name: 'What is Listen & Pick? Show how to play' });
const cancel = vi.fn();

async function ready(pool: MemoryCard[] = cards(31)) {
  h.fetchActiveCards.mockResolvedValue(pool);
  const r = render(<ListenPlay />);
  await advance(PRELOAD_MS + 10);
  return r;
}

/** Waits through the first auto-say so later counts start clean. */
async function readyAndSaid(pool?: MemoryCard[]) {
  const r = await ready(pool);
  await advance(SAY_AFTER_SHOW_MS);
  h.sayWord.mockClear();
  return r;
}

beforeEach(() => {
  vi.useFakeTimers();
  for (const f of [h.fetchActiveCards, h.sayWord, h.stopWord, h.yay, h.ohOh, h.recordWrong, h.clearWrong, h.push, h.replace, h.settings, h.select, cancel]) f.mockReset();
  h.settings.mockResolvedValue({ data: { hooray_path: null, ohoh_path: null } });
  h.sayWord.mockImplementation((_card: MemoryCard, onEnd?: () => void) => onEnd?.()); // a word that finishes at once
  h.yay.mockReturnValue({ ms: 2400, stop: vi.fn() });
  h.ohOh.mockReturnValue({ ms: 1900, stop: vi.fn() });
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: { cancel } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Listen & Pick play screen (L1-L5, L8, L10)', () => {
  it('exports the timing constants', () => {
    expect([SAY_AFTER_SHOW_MS, SAY_AFTER_WRONG_MS, HOORAY_CAP_MS, NEXT_PAUSE_MS, FINISH_DELAY_MS, STEP_CAP_MS]).toEqual([600, 700, 1800, 400, 1000, 4000]);
  });

  it('shows question 1 only after the preload, then says the answer word once after SAY_AFTER_SHOW_MS', async () => {
    h.fetchActiveCards.mockResolvedValue(cards(31));
    render(<ListenPlay />);
    await advance(PRELOAD_MS - 100);
    expect(answers()).toHaveLength(0);
    await advance(110);
    expect(qIndex()).toBe('0');
    expect(answers()).toHaveLength(3);
    expect(root().getAttribute('data-done')).toBe('false');
    expect(h.sayWord).not.toHaveBeenCalled();
    await advance(SAY_AFTER_SHOW_MS - 10);
    expect(h.sayWord).not.toHaveBeenCalled();
    await advance(10);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
    expect(h.sayWord.mock.calls[0][0].id).toBe(answerId());
    await advance(5000);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
  });

  it('reads the custom hooray / oh-oh paths from settings', async () => {
    await ready();
    expect(h.select).toHaveBeenCalledWith('hooray_path, ohoh_path');
  });

  it('the speaker button and key R say the word again', async () => {
    await readyAndSaid();
    fireEvent.click(screen.getByRole('button', { name: 'Hear the word again' }));
    expect(h.sayWord).toHaveBeenCalledTimes(1);
    expect(h.sayWord.mock.calls[0][0].id).toBe(answerId());
    fireEvent.keyDown(window, { key: 'r' });
    fireEvent.keyDown(window, { key: 'R' });
    expect(h.sayWord).toHaveBeenCalledTimes(3);
    expect(h.sayWord.mock.calls.every((c) => c[0].id === answerId())).toBe(true);
  });

  it('the first answer is focused when a question appears', async () => {
    await ready();
    expect(document.activeElement).toBe(answers()[0]);
    fireEvent.click(answers()[rightIdx()]);
    await advance(HOORAY_CAP_MS + NEXT_PAUSE_MS + 10);
    expect(qIndex()).toBe('1');
    expect(document.activeElement).toBe(answers()[0]);
  });

  it('a wrong pick: oh-oh once, dims that button, records the answer, says the word again; the question stays', async () => {
    await readyAndSaid();
    const answer = answerId();
    const [w1, w2] = wrongIdxs();
    fireEvent.click(answers()[w1]);
    expect(h.ohOh).toHaveBeenCalledTimes(1);
    expect(answers()[w1].getAttribute('data-wrong')).toBe('true');
    expect(h.recordWrong).toHaveBeenCalledTimes(1);
    expect(h.recordWrong.mock.calls[0][0].id).toBe(answer);
    await advance(SAY_AFTER_WRONG_MS - 10);
    expect(h.sayWord).not.toHaveBeenCalled();
    await advance(10);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
    expect(h.sayWord.mock.calls[0][0].id).toBe(answer);
    expect(qIndex()).toBe('0');

    // the same wrong button again does nothing
    fireEvent.click(answers()[w1]);
    fireEvent.keyDown(window, { key: String(w1 + 1) });
    await advance(SAY_AFTER_WRONG_MS + 10);
    expect(h.ohOh).toHaveBeenCalledTimes(1);
    expect(h.recordWrong).toHaveBeenCalledTimes(1);
    expect(h.sayWord).toHaveBeenCalledTimes(1);

    // the other wrong one (by key) is also recorded
    fireEvent.keyDown(window, { key: String(w2 + 1) });
    expect(h.ohOh).toHaveBeenCalledTimes(2);
    expect(h.recordWrong).toHaveBeenCalledTimes(2);
    expect(h.recordWrong.mock.calls[1][0].id).toBe(answer);
    expect(answers()[w2].getAttribute('data-wrong')).toBe('true');
    expect(qIndex()).toBe('0');
    expect(h.yay).not.toHaveBeenCalled();
  });

  it('a right pick: yay once, the word once after the hooray, the next question after the word ends + NEXT_PAUSE_MS', async () => {
    await readyAndSaid();
    const answer = answerId();
    let finish: (() => void) | undefined;
    h.sayWord.mockImplementation((_c: MemoryCard, onEnd?: () => void) => { finish = onEnd; });
    h.yay.mockReturnValue({ ms: 1000, stop: vi.fn() });
    fireEvent.click(answers()[rightIdx()]);
    expect(h.yay).toHaveBeenCalledTimes(1);
    expect(h.ohOh).not.toHaveBeenCalled();
    expect(h.recordWrong).not.toHaveBeenCalled();
    await advance(990);
    expect(h.sayWord).not.toHaveBeenCalled();
    await advance(10);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
    expect(h.sayWord.mock.calls[0][0].id).toBe(answer);
    await advance(1500); // the word is still playing
    expect(qIndex()).toBe('0');
    act(() => finish?.());
    await advance(NEXT_PAUSE_MS - 10);
    expect(qIndex()).toBe('0');
    await advance(10);
    expect(qIndex()).toBe('1');
    expect(answers().every((b) => b.getAttribute('data-wrong') === 'false')).toBe(true);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
  });

  it('the hooray wait is capped at HOORAY_CAP_MS (also when yay returns nothing)', async () => {
    await readyAndSaid();
    h.yay.mockReturnValue(undefined);
    fireEvent.click(answers()[rightIdx()]);
    await advance(HOORAY_CAP_MS - 10);
    expect(h.sayWord).not.toHaveBeenCalled();
    await advance(10);
    expect(h.sayWord).toHaveBeenCalledTimes(1);
  });

  it('a voice that never ends: the next question comes at STEP_CAP_MS after the pick', async () => {
    await readyAndSaid();
    h.sayWord.mockImplementation(() => undefined);
    fireEvent.click(answers()[rightIdx()]);
    await advance(STEP_CAP_MS - 10);
    expect(qIndex()).toBe('0');
    await advance(10);
    expect(qIndex()).toBe('1');
    await advance(STEP_CAP_MS);
    expect(qIndex()).toBe('1'); // the cap advanced once only
  });

  it('picks during the hooray pause are ignored: one advance, one yay, one word', async () => {
    await readyAndSaid();
    const r = rightIdx();
    fireEvent.click(answers()[r]);
    fireEvent.click(answers()[r]);
    fireEvent.click(answers()[(r + 1) % 3]);
    for (const k of ['1', '2', '3']) fireEvent.keyDown(window, { key: k });
    expect(h.yay).toHaveBeenCalledTimes(1);
    expect(h.ohOh).not.toHaveBeenCalled();
    expect(h.recordWrong).not.toHaveBeenCalled();
    await advance(HOORAY_CAP_MS + NEXT_PAUSE_MS + 10);
    expect(qIndex()).toBe('1');
    expect(h.sayWord).toHaveBeenCalledTimes(1); // the right word; question 2's word comes later
    await advance(STEP_CAP_MS);
    expect(qIndex()).toBe('1');
    expect(h.yay).toHaveBeenCalledTimes(1);
  });

  it('keys 1/2/3 pick and Left/Right move the focus among the answers', async () => {
    await readyAndSaid();
    expect(document.activeElement).toBe(answers()[0]);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(answers()[1]);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(answers()[2]);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(answers()[1]);
    fireEvent.keyDown(window, { key: String(rightIdx() + 1) });
    expect(h.yay).toHaveBeenCalledTimes(1);
  });

  it('Esc goes back to the game list', async () => {
    await ready();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(h.push).toHaveBeenCalledWith('/games');
  });

  it('while the help popup is open the page keys do nothing; its Esc closes only the popup', async () => {
    await readyAndSaid();
    fireEvent.click(badge());
    expect(screen.getByRole('dialog', { name: 'How to play Listen & Pick' })).toBeTruthy();
    const focused = document.activeElement;
    for (const k of ['ArrowRight', 'ArrowLeft', '1', '2', '3', 'r', 'R']) fireEvent.keyDown(document.activeElement ?? window, { key: k });
    expect(document.activeElement).toBe(focused);
    expect(h.yay).not.toHaveBeenCalled();
    expect(h.ohOh).not.toHaveBeenCalled();
    expect(h.sayWord).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement ?? window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.push).not.toHaveBeenCalled();
    expect(qIndex()).toBe('0');
    await advance(10);
    expect(document.activeElement).toBe(badge());
    // closed again: the keys work
    fireEvent.keyDown(window, { key: String(rightIdx() + 1) });
    expect(h.yay).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['fewer than 3 usable cards', () => h.fetchActiveCards.mockResolvedValue([...cards(2), { ...cards(3)[2], active: false }])],
    ['a load failure', () => h.fetchActiveCards.mockRejectedValue(new Error('boom'))],
    ['two cards with the same word only', () => h.fetchActiveCards.mockResolvedValue([...cards(2), { ...cards(3)[2], word: ' Word0 ' }])],
  ])('%s: friendly status screen, no answers', async (_name, arrange) => {
    arrange();
    render(<ListenPlay />);
    await advance(PRELOAD_MS + 10);
    expect(screen.getByRole('status', { name: 'New cards are coming soon' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(answers()).toHaveLength(0);
    expect(question()).toBeNull();
    await advance(5000);
    expect(h.sayWord).not.toHaveBeenCalled();
  });

  it('5 usable cards give 5 questions, then data-done after FINISH_DELAY_MS', async () => {
    await ready(cards(5));
    const seen = new Set<string>();
    for (let n = 0; n < 5; n++) {
      expect(qIndex()).toBe(String(n));
      seen.add(answerId()!);
      fireEvent.click(answers()[rightIdx()]);
      if (n < 4) await advance(HOORAY_CAP_MS + NEXT_PAUSE_MS + 10);
    }
    expect(seen.size).toBe(5);
    await advance(HOORAY_CAP_MS + FINISH_DELAY_MS - 10);
    expect(root().getAttribute('data-done')).toBe('false');
    await advance(10);
    expect(root().getAttribute('data-done')).toBe('true');
    expect(answers()).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Back to games' })).toBeTruthy();
    expect(h.yay).toHaveBeenCalledTimes(5);
  });

  it('31 cards give a round of 10 questions', async () => {
    await ready(cards(31));
    for (let n = 0; n < 10; n++) {
      expect(qIndex()).toBe(String(n));
      fireEvent.keyDown(window, { key: String(rightIdx() + 1) });
      await advance(HOORAY_CAP_MS + FINISH_DELAY_MS + 10);
    }
    expect(root().getAttribute('data-done')).toBe('true');
  });

  it('starting a round calls clearWrong first', async () => {
    await ready();
    expect(h.clearWrong).toHaveBeenCalled();
    expect(h.clearWrong.mock.invocationCallOrder[0]).toBeLessThan(h.fetchActiveCards.mock.invocationCallOrder[0]);
  });

  it('unmounting mid-hooray cancels timers and speech and clears the log; nothing is said afterwards', async () => {
    const r = await readyAndSaid();
    const stop = vi.fn();
    h.yay.mockReturnValue({ ms: 2400, stop });
    fireEvent.click(answers()[rightIdx()]);
    await advance(500);
    h.clearWrong.mockClear();
    r.unmount();
    expect(h.stopWord).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    expect(h.clearWrong).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalled();
    await advance(10000);
    expect(h.sayWord).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('unmounting mid-question (before the first word, and after a wrong pick) says nothing afterwards', async () => {
    const r = await ready();
    r.unmount();
    await advance(10000);
    expect(h.sayWord).not.toHaveBeenCalled();
    cleanup();

    const r2 = await readyAndSaid();
    fireEvent.click(answers()[wrongIdxs()[0]]);
    r2.unmount();
    expect(h.stopWord).toHaveBeenCalled();
    await advance(10000);
    expect(h.sayWord).not.toHaveBeenCalled();
  });

  it('the Back link leads to the game list', async () => {
    await ready();
    expect(screen.getByRole('link', { name: 'Back to games' }).getAttribute('href')).toBe('/games');
  });

  it('reduced motion: the root gets hm-reduced', async () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) });
    await ready();
    expect(root().classList.contains('hm-reduced')).toBe(true);
  });

  it('without reduced motion there is no hm-reduced', async () => {
    await ready();
    expect(root().classList.contains('hm-reduced')).toBe(false);
  });

  it('no card word appears in the page text', async () => {
    await ready(cards(5));
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/word\d/);
  });
});
