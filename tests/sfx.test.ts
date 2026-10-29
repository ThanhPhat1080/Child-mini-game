import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakKid } from '@/lib/sfx';

const spoken: { lang: string; voice: unknown; text: string }[] = [];
const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;
let voices: SpeechSynthesisVoice[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  spoken.length = 0;
  voices = [];
  vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; voice: unknown = null; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; pitch = 1; rate = 1; volume = 1; constructor(public text: string) {} });
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: () => undefined, getVoices: () => voices, speak: (u: { lang: string; voice: unknown; text: string }) => spoken.push(u), addEventListener: () => undefined, removeEventListener: () => undefined } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const flush = () => vi.advanceTimersByTime(700);

describe('speakKid language', () => {
  it('always speaks en-US, even when no voices have loaded yet', () => {
    speakKid('Hello');
    expect(spoken).toHaveLength(0); // waits a moment after cancel()
    flush();
    expect(spoken[0].lang).toBe('en-US');
    expect(spoken[0].voice).toBeNull();
  });

  it('never picks a Vietnamese voice and prefers an en-US voice', () => {
    voices = [voice('Linh', 'vi-VN'), voice('Google UK English Female', 'en-GB'), voice('Google US English', 'en-US')];
    speakKid('Hello');
    flush();
    expect((spoken[0].voice as SpeechSynthesisVoice).name).toBe('Google US English');
  });

  it('falls back to another English voice, and to none rather than Vietnamese', () => {
    voices = [voice('Linh', 'vi-VN'), voice('Daniel', 'en-GB')];
    speakKid('Hello');
    flush();
    expect((spoken[0].voice as SpeechSynthesisVoice).name).toBe('Daniel');
    voices = [voice('Linh', 'vi-VN')];
    speakKid('Hello');
    flush();
    expect(spoken[1].voice).toBeNull();
    expect(spoken[1].lang).toBe('en-US');
  });

  it('with no English voice installed (en-US fails) it tries once more with the default voice so it is not silent', () => {
    voices = [voice('Linh', 'vi-VN')];
    speakKid('Hello');
    flush();
    const first = spoken[0] as unknown as { onerror: (e: { error: string }) => void };
    first.onerror({ error: 'language-unavailable' });
    expect(spoken).toHaveLength(2);
    expect(spoken[1].lang).toBe('');
  });

  it('calls onEnd when speech ends, and never waits longer than 4 s', () => {
    voices = [voice('Google US English', 'en-US')];
    const onEnd = vi.fn();
    speakKid('Hello', { onEnd });
    vi.advanceTimersByTime(3900);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
