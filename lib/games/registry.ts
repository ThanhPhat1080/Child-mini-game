/** Game registry (ADR-014): the game list carousel reads from here. */
export type Game = { id: 'quiz' | 'memory' | 'listen' | 'spot'; href: string; ready: boolean };

export const GAMES: readonly Game[] = [
  { id: 'quiz', href: '/games/quiz', ready: true },
  { id: 'memory', href: '/games/memory', ready: true },
  { id: 'listen', href: '/games/listen', ready: true },
  { id: 'spot', href: '/games/spot', ready: false },
];
