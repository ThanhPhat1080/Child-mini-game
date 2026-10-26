/**
 * One audio manager (ADR-016). Nothing plays until the child taps "enter",
 * so call these only from a click handler. Missing files are silent.
 */
let music: HTMLAudioElement | null = null;

export function playOnce(url: string | null): void {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(() => undefined);
}

export function startMusic(url: string | null): void {
  if (!url) return;
  if (music && music.src === url) return;
  music?.pause();
  music = new Audio(url);
  music.loop = true;
  music.play().catch(() => undefined);
}
