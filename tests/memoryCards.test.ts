import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as { message: string } | null },
  eq: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  speakKid: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    from: h.from,
    storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) },
  }),
}));
vi.mock('@/lib/sfx', () => ({ speakKid: h.speakKid }));

import { fetchActiveCards, sayWord } from '@/lib/memory/cards';

class FakeAudio {
  static instances: FakeAudio[] = [];
  static playResult: 'resolve' | 'reject' = 'resolve';
  listeners: Record<string, (() => void)[]> = {};
  pause = vi.fn();
  play = vi.fn(() => (FakeAudio.playResult === 'resolve' ? Promise.resolve() : Promise.reject(new Error('blocked'))));
  constructor(public src: string) { FakeAudio.instances.push(this); }
  addEventListener(type: string, fn: () => void) { (this.listeners[type] ??= []).push(fn); }
  fire(type: string) { (this.listeners[type] ?? []).forEach((f) => f()); }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  FakeAudio.instances = [];
  FakeAudio.playResult = 'resolve';
  vi.stubGlobal('Audio', FakeAudio);
  window.Audio = FakeAudio as unknown as typeof Audio;
  h.result = { data: null, error: null };
  h.order.mockImplementation(() => Promise.resolve(h.result));
  h.eq.mockImplementation(() => ({ order: h.order }));
  h.select.mockImplementation(() => ({ eq: h.eq }));
  h.from.mockImplementation(() => ({ select: h.select }));
});

describe('fetchActiveCards', () => {
  it('asks only for active cards and returns the rows', async () => {
    const rows = [{ id: 'a', word: 'cat', image_path: 'seed/cat.svg', audio_path: null, active: true }];
    h.result = { data: rows, error: null };
    await expect(fetchActiveCards()).resolves.toEqual(rows);
    expect(h.from).toHaveBeenCalledWith('memory_cards');
    expect(h.select).toHaveBeenCalledWith('id, word, image_path, audio_path, active');
    expect(h.eq).toHaveBeenCalledWith('active', true);
    expect(h.order).toHaveBeenCalledWith('created_at');
  });

  it('throws the Supabase error message', async () => {
    h.result = { data: null, error: { message: 'boom' } };
    await expect(fetchActiveCards()).rejects.toThrow('boom');
  });
});

describe('sayWord', () => {
  it('plays the recorded file and does not speak', async () => {
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    await flush();
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe('/seed/cat.mp3');
    expect(FakeAudio.instances[0].play).toHaveBeenCalled();
    expect(h.speakKid).not.toHaveBeenCalled();
  });

  it('speaks the word when there is no recording', () => {
    sayWord({ word: 'cat', audio_path: null });
    expect(FakeAudio.instances).toHaveLength(0);
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('falls back to speech when play() is rejected', async () => {
    FakeAudio.playResult = 'reject';
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    await flush();
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('falls back to speech when the file fires an error event', async () => {
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    FakeAudio.instances[0].fire('error');
    await flush();
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('falls back only once when both the rejection and the error event happen', async () => {
    FakeAudio.playResult = 'reject';
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    FakeAudio.instances[0].fire('error');
    await flush();
    FakeAudio.instances[0].fire('error');
    expect(h.speakKid).toHaveBeenCalledTimes(1);
  });

  it('pauses the previous recording when a new word starts', async () => {
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    sayWord({ word: 'dog', audio_path: 'seed/dog.mp3' });
    await flush();
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    expect(FakeAudio.instances[1].pause).not.toHaveBeenCalled();
  });

  it('a stale recording that errors later does not speak over the new word', async () => {
    sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' });
    sayWord({ word: 'dog', audio_path: null });
    FakeAudio.instances[0].fire('error');
    await flush();
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('dog');
  });

  it('speaks when the recording URL cannot be resolved', () => {
    sayWord({ word: 'cat', audio_path: 'pending:gone' });
    expect(FakeAudio.instances).toHaveLength(0);
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('cat');
  });

  it('never throws when Audio itself fails', () => {
    vi.stubGlobal('Audio', function Boom() { throw new Error('no audio'); });
    expect(() => sayWord({ word: 'cat', audio_path: 'seed/cat.mp3' })).not.toThrow();
    expect(h.speakKid).toHaveBeenCalledExactlyOnceWith('cat');
  });
});
