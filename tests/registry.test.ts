import { describe, expect, it } from 'vitest';
import { GAMES } from '@/lib/games/registry';

describe('game registry', () => {
  it('has unique ids', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });
  it('lists quiz, memory, spot in that order', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['quiz', 'memory', 'spot']);
  });
  it('marks quiz and memory ready and spot not ready', () => {
    const ready = Object.fromEntries(GAMES.map((g) => [g.id, g.ready]));
    expect(ready).toEqual({ quiz: true, memory: true, spot: false });
  });
  it('points to the game routes', () => {
    const href = Object.fromEntries(GAMES.map((g) => [g.id, g.href]));
    expect(href.quiz).toBe('/games/quiz');
    expect(href.memory).toBe('/games/memory');
  });
  it('quiz and memory have a help popup, spot does not', () => {
    const help = Object.fromEntries(GAMES.map((g) => [g.id, g.hasHelp === true]));
    expect(help).toEqual({ quiz: true, memory: true, spot: false });
  });
});
