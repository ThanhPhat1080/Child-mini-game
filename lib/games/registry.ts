/** Game registry (ADR-014): the game list carousel reads from here. */
export type Game = { id: 'quiz' | 'memory' | 'spot'; href: string; ready: boolean; /** Has a "?" tutorial popup on the game list. */ hasHelp?: boolean };

export const GAMES: readonly Game[] = [
  { id: 'quiz', href: '/games/quiz', ready: true, hasHelp: true },
  { id: 'memory', href: '/games/memory', ready: true, hasHelp: true },
  { id: 'spot', href: '/games/spot', ready: false },
];
