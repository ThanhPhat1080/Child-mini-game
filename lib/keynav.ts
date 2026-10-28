/** Keyboard helpers for the child screens: arrows move between choices, Enter and Space pick the focused one. */

/** True for the two keys that press a focused button: Enter and Space. */
export const isPressKey = (e: { key: string }): boolean => e.key === 'Enter' || e.key === ' ';

/** Moves focus one step left (-1) or right (1) among `items`, starting at the first/last one when none has focus. */
export function stepFocus(items: HTMLElement[], dir: 1 | -1): void {
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = at === -1 ? (dir === 1 ? 0 : items.length - 1) : Math.max(0, Math.min(items.length - 1, at + dir));
  items[next].focus();
}

/** Handles ArrowLeft/ArrowRight (and Space on links, which only react to Enter by default). Returns true when the key was used. */
export function handleChoiceKey(e: KeyboardEvent, items: HTMLElement[]): boolean {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    stepFocus(items, e.key === 'ArrowRight' ? 1 : -1);
    return true;
  }
  const active = document.activeElement as HTMLElement | null;
  if (e.key === ' ' && active && active.tagName === 'A' && items.includes(active)) {
    e.preventDefault();
    active.click();
    return true;
  }
  return false;
}
