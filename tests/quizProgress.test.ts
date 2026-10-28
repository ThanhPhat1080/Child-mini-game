import { describe, expect, it } from 'vitest';
import { nextUnfinished } from '@/lib/quizProgress';

const ids = ['a', 'b', 'c', 'd'];
const done = (...x: string[]) => new Set(x);

describe('nextUnfinished', () => {
  it('goes to the next question in order', () => {
    expect(nextUnfinished(ids, 0, done('a'))).toBe(1);
    expect(nextUnfinished(ids, 1, done('a', 'b'))).toBe(2);
  });

  it('is complete only when every question is done', () => {
    expect(nextUnfinished(ids, 3, done('a', 'b', 'c', 'd'))).toBeNull();
  });

  it('finishing the last question does NOT complete the set while others are not done', () => {
    expect(nextUnfinished(ids, 3, done('d'))).toBe(0);
  });

  it('after jumping ahead, goes back to the first unfinished one', () => {
    expect(nextUnfinished(ids, 3, done('d'))).toBe(0);
    expect(nextUnfinished(ids, 3, done('d', 'a'))).toBe(1);
  });

  it('skips questions that are already done', () => {
    expect(nextUnfinished(ids, 0, done('a', 'b', 'c'))).toBe(3);
    expect(nextUnfinished(ids, 1, done('b', 'c', 'd'))).toBe(0);
  });

  it('a one-question set completes when that question is done', () => {
    expect(nextUnfinished(['x'], 0, done('x'))).toBeNull();
  });

  it('an empty set has nothing to go to', () => {
    expect(nextUnfinished([], 0, done())).toBeNull();
  });
});
