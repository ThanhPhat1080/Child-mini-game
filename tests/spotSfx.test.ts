import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let created = 0;
let started = 0;
let freqs: number[] = [];

function makeParam() {
  return { setValueAtTime: vi.fn((v: number) => { freqs.push(v); }), exponentialRampToValueAtTime: vi.fn(), value: 0 };
}
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createGain() {
    return { gain: makeParam(), connect: (n: unknown) => n, disconnect: vi.fn() };
  }
  createOscillator() {
    created++;
    return { type: 'sine', frequency: makeParam(), connect: (n: unknown) => n, start: () => { started++; }, stop: vi.fn() };
  }
}

beforeEach(() => { created = 0; started = 0; freqs = []; vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('spot sound', () => {
  it('ting starts exactly one oscillator near 1568 Hz', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const { ting } = await import('@/lib/sfx');
    ting();
    expect(created).toBe(1);
    expect(started).toBe(1);
    expect(freqs).toContain(1568);
  });

  it('ting is a silent no-op without an AudioContext', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const { ting } = await import('@/lib/sfx');
    expect(() => ting()).not.toThrow();
    expect(created).toBe(0);
  });
});
