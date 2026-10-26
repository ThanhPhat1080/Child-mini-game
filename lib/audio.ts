/**
 * One audio manager (ADR-016). Nothing plays until the child taps "enter",
 * so start sounds only from a click handler. Missing files are silent.
 */
let music: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let muted = false;

export function playOnce(url: string | null): void {
  if (!url) return;
  const audio = new Audio(url);
  audio.play().catch(() => undefined);
}

/** Starts (or resumes) the looping background track at volume 0..100. */
export function startMusic(url: string | null, volume = 30): void {
  if (!url) return;
  if (!music || currentUrl !== url) {
    music?.pause();
    music = new Audio(url);
    music.loop = true;
    currentUrl = url;
  }
  music.volume = Math.min(1, Math.max(0, volume / 100));
  music.muted = muted;
  if (music.paused && !muted) music.play().catch(() => undefined);
}

export function setMusicMuted(value: boolean): void {
  muted = value;
  if (!music) return;
  music.muted = value;
  if (!value && music.paused) music.play().catch(() => undefined);
}

export function isMusicMuted(): boolean {
  return muted;
}
