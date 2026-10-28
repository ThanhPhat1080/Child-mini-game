/**
 * Where to go after a question is finished: the next question (cycling past the end) that the child has
 * not answered correctly yet, or null when every question is done and the set is complete.
 */
export function nextUnfinished(ids: readonly string[], current: number, done: ReadonlySet<string>): number | null {
  const n = ids.length;
  for (let step = 1; step <= n; step++) {
    const i = (current + step) % n;
    if (!done.has(ids[i])) return i;
  }
  return null;
}
